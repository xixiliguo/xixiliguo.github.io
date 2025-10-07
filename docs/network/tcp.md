
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
reset分为主动reset和被动reset两种。

主动reset的场景目前只有一种：
1. 进程调用close关闭连接且仍有数据可读时会触发主动reset。

从代码上分析,主动reset的数据包里会带rst,ack两个标志位, 其中`ack number`为`tcp_sk(sk)->rcv_nxt`，代表这个seq前的数据
tcp协议栈已经收到， 不代表应用已收到。`seq number`为下一个要发送的seq。
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

被动reset属于收到非法包后发reset，常见的场景：
1. 收到syn报文，但目的port并没有处于监听状态， 则发reset。
2. 报文里的ack-seq不在合理的范围内，即非法。
3. tcp的标志为非法，比如listen socket收到的包含ack标志位。
4. 处于TCP_FIN_WAIT1状态时，收到的报文seq不合法，可以观察`TcpExtTCPAbortOnData`这个计数器
``` c
static void tcp_v4_send_reset(const struct sock *sk, struct sk_buff *skb,
			      enum sk_rst_reason reason)
{
	/* Swap the send and the receive. */
	memset(&rep, 0, sizeof(rep));
	rep.th.dest   = th->source;
	rep.th.source = th->dest;
	rep.th.doff   = sizeof(struct tcphdr) / 4;
	rep.th.rst    = 1;

	if (th->ack) {
		rep.th.seq = th->ack_seq;
	} else {
		rep.th.ack = 1;
		rep.th.ack_seq = htonl(ntohl(th->seq) + th->syn + th->fin +
				       skb->len - (th->doff << 2));
	}
}
```
如果收到的包flag有ack,则`seq number`有值， `ack number`为0    flag有 rst  
如果收到的包flag没有ack,则`seq number`为0， `ack number`有值   flag有 rst & ack   
**在被动reset场景下是通过一个全局socket发送具体的reset包, 这个包的ip层的id为0**

抓包上直接通过ip层的id判断，如果是0，则为被动reset, 否则为主动reset。
trace_tcp_send_reset这个tracepoint里, 如果skb为null, 则代表主动reset, 如果非null,
则代表被动reset, skb是接收到的skb.

## TCP 重传

`TcpRetransSegs` 约等于  `TcpExtTCPFastRetrans` + `TcpExtTCPSlowStartRetrans` + 
`TcpExtTCPTimeouts` + 部分`TcpExtTCPLossProbes`  
`TcpExtTCPTimeouts`单位是次数，但一次重传一个seg. 其他单位都是 seg。   

`TcpExtTCPSynRetrans` 表示syn或者synack的重传seg数目。 `TcpExtTCPSynRetrans`增加时，
`TcpExtTCPTimeouts`和 `TcpRetransSegs` 都会增加。但`TcpExtTCPSynRetrans`
跟 `TcpExtTCPFastRetrans` 和 `TcpExtTCPSlowStartRetrans` 没有重叠。

`TcpExtTCPLostRetransmit` 表示重传过的报文再次丢失的数目。  

`TcpExtTCPLossProbes` 可能发重传包，也可能发queue里的第一个数据， 只有发重传包时`TcpRetransSegs`
会增加。

```
# nstat -r -z | grep -E "Retrans|Loss|Timeout"
IpReasmTimeout                  0                  0.0
TcpRetransSegs                  25                 0.0
Ip6ReasmTimeout                 0                  0.0
TcpExtTCPLossUndo               0                  0.0
TcpExtTCPLostRetransmit         15                 0.0
TcpExtTCPLossFailures           0                  0.0
TcpExtTCPFastRetrans            0                  0.0
TcpExtTCPSlowStartRetrans       0                  0.0
TcpExtTCPTimeouts               22                 0.0
TcpExtTCPLossProbes             14                 0.0
TcpExtTCPLossProbeRecovery      0                  0.0
TcpExtTCPAbortOnTimeout         1                  0.0
TcpExtTCPRetransFail            0                  0.0
TcpExtTCPSynRetrans             14                 0.0
TcpExtTcpTimeoutRehash          21                 0.0
MPTcpExtMPTCPRetrans            0                  0.0
```

## ethtool -k 信息来源
`ethtool -k [dev]` 可以查询网络关于offload的相关信息。数据主要来源于`struct net_device`结构体
里如下三个字段，每个bit位代表一个功能是否on或者off。  
`hw_features` 表示硬件提供的初始能力情况  
`features`    表示当前的特性生效状态   
`wanted_features`  表示期望达到的状态,通常是user触发，比如利用ethtool工具修改特性值  
在`/sys`下面没有暴露用户态接口可查这三个字段的信息。  

每个特性对应的bit位，可以查看`include/linux/netdev_features.h`文件  

`ethtool -k `输出的结果里，含`[fixed]` 表示硬件没提供这个特性修改为on或者off的能力，即`hw_features`对应的bit位是0。
`[request on xxx]`表示该特性当前值和期望值不一样， `reuest on` 里显示的是期望值。  

运行`ethtool -K eth0 xxx on/off`时的函数调用如下：
``` c
ethnl_set_features
  --> __netdev_update_features
    --> dev->netdev_ops->ndo_set_features   //网卡驱动自身的设置特性函数
```
如果是virtio_net驱动，仅能修改`NETIF_F_GRO_HW` `NETIF_F_RXHASH`。 其他情况返回0代表设置成功，但其实
没做任何修改。

## ping发送报文常见的报错
EINVAL "Invalid argument" 表示arp表满导致丢包 https://access.redhat.com/solutions/2985371    
对应代码实现如下：
``` c
static int ip_finish_output2(struct net *net, struct sock *sk, struct sk_buff *skb)
{
	neigh = ip_neigh_for_gw(rt, skb, &is_v6gw);
	if (!IS_ERR(neigh)) {
		int res;

		sock_confirm_neigh(skb, neigh);
		/* if crossing protocols, can not use the cached header */
		res = neigh_output(neigh, skb, is_v6gw);
		rcu_read_unlock_bh();
		return res;
	}
	net_dbg_ratelimited("%s: No header cache and no neighbour!\n",
			    __func__);
	kfree_skb_reason(skb, SKB_DROP_REASON_NEIGH_CREATEFAIL);
	return -EINVAL;
}
```
EPERM "Operation not permitted" 表示iptable有规则将发送方向的包drop掉 https://access.redhat.com/solutions/509223  
下面代码显示当netfilter框架的hook函数返回`NF_DROP`时，向上层返回`-EPERM`
``` c
int nf_hook_slow(struct sk_buff *skb, struct nf_hook_state *state,
		 const struct nf_hook_entries *e, unsigned int s)
{
	unsigned int verdict;
	int ret;

	for (; s < e->num_hook_entries; s++) {
		verdict = nf_hook_entry_hookfn(&e->hooks[s], skb, state);
		switch (verdict & NF_VERDICT_MASK) {
		case NF_ACCEPT:
			break;
		case NF_DROP:
			kfree_skb_reason(skb,
					 SKB_DROP_REASON_NETFILTER_DROP);
			ret = NF_DROP_GETERR(verdict);
			if (ret == 0)
				ret = -EPERM;
			return ret;
		case NF_QUEUE:
			ret = nf_queue(skb, state, s, verdict);
			if (ret == 1)
				continue;
			return ret;
		case NF_STOLEN:
			return NF_DROP_GETERR(verdict);
		default:
			WARN_ON_ONCE(1);
			return 0;
		}
	}

	return 1;
}
```
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
https://arthurchiao.art/blog/tcp-retransmission-may-be-misleading  
