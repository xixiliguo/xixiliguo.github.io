
记录自己对TCP协议栈的学习心得

<!--more-->
## TCP处理与内核参数
1. client发送`syn`报文后,tcp状态为 syn-sent. 如果对端没有返回syn+ack, 则尝试发送`net.ipv4.tcp_syn_retries`次. 每次间隔2,4,8s....  
2. server收到`syn`后,状态变为 syn-recv, 放到半队列里,同时返回syn-ack. 这个队列的大小为 net.ipv4.tcp_max_syn_backlog. 是个全局的参数. 如果这个半队列满,则直接丢弃syc.
3. 当server收到ack后, 会检查全队列是否能放下. 这个大小为 min(backlog, net.core.somaxconn). 如果队列未满,则放进去, 状态变为 ESTABLISHED.  系统调用accept就是从这个全队列取已经三次握手成功的socket  
如果全队列满:  
当net.ipv4.tcp_abort_on_overflow为0, 则丢弃ack, 假定自己没有收到ack, 所以重发syn+ack, 重试次数为net.ipv4.tcp_synack_retries.   
当net.ipv4.tcp_abort_on_overflow为1, 则收到ack后直接发rst终止连接   
4. 先close socket的会进入time-wait状态, 这个过2MSL会自动消失.   
   client和server同时打开时间戳时:  
   * net.ipv4.tcp_tw_recycle = 1, 可快速回收进入time-wait状态的socket. 对客户端和服务端都有效. 但在nat网络下可能会将正常的syn报文丢弃  
   * net.ipv4.tcp_tw_reuse = 1, 可快速重用time-wait的socket. 只对客户端有效.作为客户端因为有端口65535问题，TIME_OUT过多直接影响处理能力，打开tw_reuse 即可解决  
   * tcp_max_tw_buckets设置time-wait的上限, 一旦超过OS会立即清除.  
5. 当收到fin后, 回复ack后 socket进入close-wait状态. 此时需要程序运行close才会下发fin报文. 完成4次关闭  
6. 假设发送fin后, 没有收到对端的fin, 则socket进入 fin-wait-2状态. 如果一直没有收到对端的fin, 则经过`net.ipv4.tcp_fin_timeout`秒后自动消失  

## TCP半队列和全队列监控

半队列如果丢包, 可检查如下值是否增长:  
`netstat -s` 观察`SYNs to LISTEN sockets dropped`  
`nstat` 观察 `ListenDrops`  

全队列如果丢包, 可检查如下值是否增长:  
`netstat -s` 观察`times the listen queue of a socket overflowed`  
`nstat` 观察 `TcpExtListenOverflows`  
两个工具的信息都取自`/proc/net/netstat`  

## TCP丢包一些排查方法
使用perf 跟踪 skb:kfree_skb, 然后看堆栈  
https://jvns.ca/blog/2017/09/05/finding-out-where-packets-are-being-dropped/ 

## net.ipv4.tcp_tw_recycle = 1
在nat场景下会产生丢包. 高内核已经删除这个参数  
https://github.com/torvalds/linux/commit/4396e46187ca5070219b81773c4e65088dac50cc  
对应的计数项为`TcpExtPAWSPassive`  

## tcp部分参数使用介绍
tcp keepalive默认一些参数如下, 应用程序里也可以修改. enable该特性必须是在程序里设置. OS没有全部的打开该功能的参数  
``` bash
$ sysctl -a | grep keep
net.ipv4.tcp_keepalive_intvl = 75
net.ipv4.tcp_keepalive_probes = 9
net.ipv4.tcp_keepalive_time = 7200
```
Nagle算法主要在数据包很小很小时,先不发,等累积到一定程度再发出去.默认是打开的.应用程序可以通过TCP_NODELAY 选项来关闭这个算法, OS没有全局的关闭该算法的参数  

TCP的延迟确认的策略：  
当有响应数据要发送时，ACK 会随着响应数据一起立刻发送给对方  
当没有响应数据要发送时，ACK 将会延迟一段时间，以等待是否有响应数据可以一起发送  
如果在延迟等待发送 ACK 期间，对方的第二个数据报文又到达了，这时就会立刻发送 ACK  
  
最大延迟确认时间是 200 ms （1000/5）  
最短延迟确认时间是 40 ms （1000/25）  

tcp_retries2 指定超时重传的次数, 默认是15次, 大概是16分钟左右

比如已经建立的TCP连接, 因某些原因(防火墙,中间网络中断)导致发往另一方的包, 一直没有收到回包. 这个RTO超时后开始重传.   
RTO最小是 200ms,  最大是 2分钟.   每次发起重传的间隔为  200ms, 400ms, 800ms 逐渐递增.  


## TCP reset
reset分为主动reset和被动reset两种, 比如进程调用close关闭连接且仍有数据为读时会触发主动reset, 对端建立连接但本端
却没有对应的监听socket时会触发被动reset.
从代码上分析,主动reset的数据包里会带rst,ack两个标志位, 但`ack number`为0. `seq number`为下一个要发送的seq.
``` c
void tcp_send_active_reset(struct sock *sk, gfp_t priority)
{
	struct sk_buff *skb;

	TCP_INC_STATS(sock_net(sk), TCP_MIB_OUTRSTS);

	/* NOTE: No TCP options attached and we never retransmit this. */
	skb = alloc_skb(MAX_TCP_HEADER, priority);
	if (!skb) {
		NET_INC_STATS(sock_net(sk), LINUX_MIB_TCPABORTFAILED);
		return;
	}

	/* Reserve space for headers and prepare control bits. */
	skb_reserve(skb, MAX_TCP_HEADER);
	tcp_init_nondata_skb(skb, tcp_acceptable_seq(sk),
			     TCPHDR_ACK | TCPHDR_RST);
	tcp_mstamp_refresh(tcp_sk(sk));
	/* Send it off. */
	if (tcp_transmit_skb(sk, skb, 0, priority))
		NET_INC_STATS(sock_net(sk), LINUX_MIB_TCPABORTFAILED);

	/* skb of trace_tcp_send_reset() keeps the skb that caused RST,
	 * skb here is different to the troublesome skb, so use NULL
	 */
	trace_tcp_send_reset(sk, NULL);
}
```

被动reset属于收到非法包后发reset:  
如果收到的包flag有ack,则`seq number`有值， `ack number`为0    flag只有rst  
如果收到的包flag没有ack,则`seq number`为0， `ack number`有值   flag rst & ack   
在被动reset场景下是通过一个全局socket发送具体的reset包, 这个包的ip层的id为0.  

trace_tcp_send_reset这个tracepoint里, 如果skb为null, 则代表主动reset, 如果非null,
则代表导致发送reset的skb(接收到的). 如果没有对应的sk, 是无法用这个tracepoint跟踪
到的.



## 参考
https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt  
https://www.jianshu.com/p/0d6243402987  
https://www.codedump.info/post/20190227-tcp/  
https://blog.packagecloud.io/eng/2016/06/22/monitoring-tuning-linux-networking-stack-receiving-data  
https://blog.packagecloud.io/eng/2017/02/06/monitoring-tuning-linux-networking-stack-sending-data   
https://lwn.net/Articles/362339/  
https://access.redhat.com/solutions/30453  
https://loicpefferkorn.net/2016/03/linux-network-metrics-why-you-should-use-nstat-instead-of-netstat/  
https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt  
https://perthcharles.github.io/2015/09/07/wiki-tcp-retries/  
https://pracucci.com/linux-tcp-rto-min-max-and-tcp-retries2.html  
