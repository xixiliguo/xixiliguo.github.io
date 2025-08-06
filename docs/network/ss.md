

# ss 命令介绍

ss 替代传统的netstat, 通过netlink API获取网络连接socket(udp, tcp)的信息, 性能好且查询的结果丰富.  
以下信息基于 5.14内核    

## socket统计概要

运行`ss -s`获取当前系统中运行的Socket概要信息, 对系统有一个初步的了解.
从`/proc/net/sockstat` 和 `/proc/net/sockstat6` 采集的原始信息.
``` bash
# ss -s
Total: 173
TCP:   15 (estab 8, closed 3, orphaned 0, timewait 3)

Transport Total     IP        IPv6
RAW       1         1         0
UDP       2         1         1
TCP       12        8         4
INET      15        10        5
FRAG      0         0         0
```
如上图所示:  
系统当前总的socket为 173  
TCP 总共 `15`个,  等于 `倒数第三行的 total +  closed `  
`closed = orphaned + timewait + others`  , 这块的others是指tcp状态为`tcp-close`的scoket，已经不在hash桶里的,但仍被进程占用的socket, 
通常`others`有两个场景:
1. 刚创建的socket, 或者bind过，未connect，此时状态默认为`tcp-close`    
2. shutdown,而非close调用socket后，四次挥手后的socket,状态也为`tcp-close`   

`closed`并不是真实存在的一个计数，而且通过计算得来。 bind系统调用不改变tcp状态， 仍算到 closed里。  
``` c
static int print_summary(void)
{
	struct ssummary s;
	int tcp_estab;

	if (get_sockstat(&s) < 0)
		perror("ss: get_sockstat");
	if (get_snmp_int("Tcp:", "CurrEstab", &tcp_estab) < 0)
		perror("ss: get_snmpstat");

	printf("Total: %d\n", s.socks);

	printf("TCP:   %d (estab %d, closed %d, orphaned %d, timewait %d)\n",
	       s.tcp_total + s.tcp_tws, tcp_estab,
	       s.tcp_total - (s.tcp4_hashed + s.tcp6_hashed - s.tcp_tws),
	       s.tcp_orphans, s.tcp_tws);
	printf("Transport Total     IP        IPv6\n");
	printf("RAW	  %-9d %-9d %-9d\n", s.raw4+s.raw6, s.raw4, s.raw6);
	printf("UDP	  %-9d %-9d %-9d\n", s.udp4+s.udp6, s.udp4, s.udp6);
	printf("TCP	  %-9d %-9d %-9d\n", s.tcp4_hashed+s.tcp6_hashed, s.tcp4_hashed, s.tcp6_hashed);
	return 0;
}
```


使用`shutdown`关闭socket并收到ack后，socket进入`FIN-WAIT-2`状态，不受`net.ipv4.tcp_fin_timeout`的控制，不会超时自动释放，后续收到
fin报文后，新生成一个`TIME-WAIT`的socket（统计在`ss -s`的`timewait`里, 自身进入`tcp-close`状态，统计在`ss -s`的`closed`里。   
使用`close`关闭socket并收到ack后，socket进入`FIN-WAIT-2`状态，受`net.ipv4.tcp_fin_timeout`的控制（统计在`ss -s`的`timewait`里），
如果没收到fin报文则超时自动释放，如果收到fin报文后，修改`tw->tw_substate` 为 `TIME-WAIT`（依旧统计在`ss -s`的`timewait`里）。    

所以处于`FIN-WAIT-2`状态（close调用的）和`TIME-WAIT`的socket会算到 `timewait`  

参考： https://access.redhat.com/solutions/505903  


如下对每一种TCP状态的socket统计, 上面提到的others无法统计到
``` bash
# ss -H -ta | awk '{print $1}' | sort | uniq -c
      8 ESTAB
      1 FIN-WAIT-2
      4 LISTEN
      2 TIME-WAIT
```


下发close后的TCP状态，都会算到  tcp_orphan_count 里，后续在`inet_csk_destroy_sock`里减掉。
``` c
void __tcp_close(struct sock *sk, long timeout)
{
	this_cpu_inc(tcp_orphan_count);
}

``` c
void inet_csk_destroy_sock(struct sock *sk)
{
	sk->sk_prot->destroy(sk);
	sk_stream_kill_queues(sk);
	xfrm_sk_free_policy(sk);
	sk_refcnt_debug_release(sk)
	this_cpu_dec(*sk->sk_prot->orphan_count);
	sock_put(sk);
}
```
`time-wait`状态的，是通过`tw_timer_handler`里的函数释放掉，不通过`inet_csk_destroy_sock`，所以
通过`close`调用后的处于`FIN-WAIT-1`或者`LAST-ACK`状态的socket会算到 `orphaned`。   

通过`shutdown`调用可能会进入`FIN-WAIT-1`，`FIN-WAIT-2`，或者`LAST-ACK`。 `FIN-WAIT-1`可能性很低，暂
不讨论，其他两个可通过 ss -o判断， **如果有定时器，则说明是`close`调用，没有则说明是`shutdown`调用**   

`LAST-ACK` 如果没收到ack, 即继续重发fin， 默认8次后自动释放。重试次数的相关代码如下：
``` c
static int tcp_write_timeout(struct sock *sk)
{
	if ((1 << sk->sk_state) & (TCPF_SYN_SENT | TCPF_SYN_RECV)) {
	} else {
		retry_until = READ_ONCE(net->ipv4.sysctl_tcp_retries2);
		if (sock_flag(sk, SOCK_DEAD)) {
			const bool alive = icsk->icsk_rto < TCP_RTO_MAX;

			retry_until = tcp_orphan_retries(sk, alive);
		}
	}
}
static int tcp_orphan_retries(struct sock *sk, bool alive)
{
	int retries = READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_orphan_retries); /* May be zero. */

	/* We know from an ICMP that something is wrong. */
	if (sk->sk_err_soft && !alive)
		retries = 0;

	/* However, if socket sent something recently, select some safe
	 * number of retries. 8 corresponds to >100 seconds with minimal
	 * RTO of 200msec. */
	if (retries == 0 && alive)
		retries = 8;
	return retries;
}
```
tcp_close状态的socket, 也会从hash桶里去掉。
``` c
void tcp_set_state(struct sock *sk, int state)
{
	int oldstate = sk->sk_state;
	switch (state) {

	case TCP_CLOSE:
		if (oldstate == TCP_CLOSE_WAIT || oldstate == TCP_ESTABLISHED)
			TCP_INC_STATS(sock_net(sk), TCP_MIB_ESTABRESETS);

		sk->sk_prot->unhash(sk);
		if (inet_csk(sk)->icsk_bind_hash &&
		    !(sk->sk_userlocks & SOCK_BINDPORT_LOCK))
			inet_put_port(sk);
		fallthrough;
	}
	inet_sk_state_store(sk, state);
}
```
如下代码可统计每个进程占有的socket数目， 可通过`bash closed_sock.sh | sort -n -k 4 | tail -19` 排序。
``` bash
#/bin/bash
for PROC in `ls  /proc/|grep "^[0-9]"`
do
  num=`ls -rlt /proc/$PROC/fd | grep socket | wc -l`
  echo proc $PROC socket $num
done
```




上面显示的`TCP:   15 (estab 8, closed 3, orphaned 0, timewait 3)`,除了`estab`和`timewait`外，其他都不是per-net的，
在容器场景下数据存在不准确的情况     

## 基本操作

```
ss -s          #显示各socket的统计信息
ss -ntlp       #-n 不解析, -t 显示tcp连接  -l 显示监听socket, -p 显示使用的进程名
ss -t -a       #查看所有tcp连接, 不带-a则指显示 Established 连接
ss -to         #查看tcp的keepalive信息
ss -ti         #查看tcp的内部信息,比如拥塞算法,rto,rtt,cwnd,ssthresh等
ss -tm         #查看tcp的内存使用信息, 比如收发缓冲区的大小
```

## 高级过滤用法

```
ss  -A raw,packet_raw  -a -p                      #查看raw socket的信息
ss -tan  state listening                           #显示处于listening状态的连接
ss -tan  state established                         #显示处于established状态的连接
ss -tan  state listening  '( sport == 22 )'        #显示处于listening状态且源端口为22的连接
ss -tan '( sport == 22 )'                          #显示源端口为22的连接
ss -tan '( sport != 22 )'                          #显示源端口不为22的连接
ss -tan '( sport == 22 || dport == 22 )'           #显示源端口为22或者目标端口为22的连接
ss -tan '( dst 10.211.55.2 && dport == 58181 )'    #显示目标ip为10.211.55.2且目标端口为58181的连接
ss -tan '( src 127.0.0.1 )'                        #显示源ip为 127.0.0.1的连接
ss -tan '( ! dst 10.211.55.2 && dport != 58181 )'  #显示目标ip不是10.211.55.2且目标端口不是58181的连接
ss -tan "src == *:22"                              #显示源端口是22的所有连接
```

state后面支持的TCP状态如下:
``` c
	static const char * const sstate_namel[] = {
		"UNKNOWN",
		[SS_ESTABLISHED] = "established",
		[SS_SYN_SENT] = "syn-sent",
		[SS_SYN_RECV] = "syn-recv",
		[SS_FIN_WAIT1] = "fin-wait-1",
		[SS_FIN_WAIT2] = "fin-wait-2",
		[SS_TIME_WAIT] = "time-wait",
		[SS_CLOSE] = "unconnected",
		[SS_CLOSE_WAIT] = "close-wait",
		[SS_LAST_ACK] = "last-ack",
		[SS_LISTEN] =	"listening",
		[SS_CLOSING] = "closing",
	};
```
## --memory输出解释
```
 skmem:(r<rmem_alloc>,rb<rcv_buf>,t<wmem_alloc>,tb<snd_buf>,
                            f<fwd_alloc>,w<wmem_queued>,o<opt_mem>,
                            bl<back_log>,d<sock_drop>)
```
`sock_drop`的单位是`tcp seg`, 其他字段的单位都是字节, 且每一次增加减少的都是`skb->truesize`,
`rcv_buf` 指接收缓冲区大小, `snd_buf`指发送缓冲区大小.  
`opt_mem`只在部分特殊场景下才会增加， 参见 https://access.redhat.com/solutions/2070883

接收过程中,如果当前socket正处于进程上下文,那么包放到backlog算到`back_log`里,
否则放到receive_queue里,算到 `rmem_alloc`里,同时`fwd_alloc`减少

发送过程中生成的skb先计算到`wmem_queued`里,同时`fwd_alloc`减少。如果拥塞窗口允许且包发送到L3层, 那么也会计算到`wmem_alloc`里, 然后通过`tcp_event_new_data_sent`函数将skb从write_queue删除, 放到rtx_queue里(这是一个红黑树, 根据seq排序)，表示包已发送，等待ack回复。

在后续的接收过程中通过获取到的ack, 调用 `tcp_clean_rtx_queue` 清理已被对方ack的skb, 最终`wmem_queued`的值做相应的减少,紧接着在kfree_skb时通过调用`tcp_wfree`减少`wmem_alloc`。
``` c
tcp_clean_rtx_queue()
  tcp_rtx_queue_unlink_and_free()
    tcp_wmem_free_skb()
	  sk_wmem_queued_add(sk, -skb->truesize) //减少wmem_queued
	  sk_mem_uncharge(sk, skb->truesize)
	  __kfree_skb(skb) //减少wmem_alloc
```

`rmem_alloc` >= `rcv_buf` 或者 `wmem_queued` >= `snd_buf` 就算缓冲区满。

## Recv-Q 与 Send-Q
```
State          Recv-Q          Send-Q    Local Address:Port     Peer Address:Port
LISTEN         0               1024      xxx.xxx.xxx.xxx:xxx    xxx.xxx.xxx.xxx:*
ESTAB          0               52        xxx.xxx.xxx.xxx:xxx    xxx.xxx.xxx.xxx:xxx
```
处于listen状态的socket, 队列指的是已完成TCP三次握手但进程还没有通过accept取走的连接个数, recv-q 表示当前连接个数. send-q是最大连接数  
其他状态时, recv-q 表示已到达接受队列但进程还没有取走的字节数(e.g. TCP协议的话不包括IP和TCP头), send-q表示在发送队列中还未发到L3和已发送但还未收到对方ack的字节数  

``` c
	if (state == TCP_LISTEN)
		rx_queue = READ_ONCE(sk->sk_ack_backlog);
	else
		/* Because we don't lock the socket,
		 * we might find a transient negative value.
		 */
		rx_queue = max_t(int, READ_ONCE(tp->rcv_nxt) -
				      READ_ONCE(tp->copied_seq), 0);

	READ_ONCE(tp->write_seq) - tp->snd_una
```

## -i 显示tcp内部状态
``` bash
ESTAB            0                 0           192.168.3.21:22           192.168.3.11:53942
         cubic wscale:8,7 rto:234 rtt:33.6/12.372 ato:40 mss:1460 pmtu:1500 rcvmss:1460 advmss:1460 cwnd:10 ssthresh:43 bytes_sent:18548977 bytes_acked:18548977 bytes_received:9093761 segs_out:46323 segs_in:44834 data_segs_out:35908 data_segs_in:29570 send 3476190bps lastsnd:2168 lastrcv:328 lastack:328 pacing_rate 6952296bps delivery_rate 152679736bps delivered:35909 app_limited busy:445323ms rcv_rtt:21.354 rcv_space:115272 rcv_ssthresh:682103 minrtt:0.094 snd_wnd:1049856
```
cubic 表示当前使用的拥塞算法  
`wscale:<snd_wscale>:<rcv_wscale>` 滑动窗口扩展因子，发送方向和接受方向。发送方向的数值是对端发送syn/synack报文时传过来的，接受方向是自行计算出数值后，会通过syn/synack报文发给对端。  
rto  重传超时时间，单位是ms  
`rtt:<rtt>/<rttvar>`  rtt是平均rtt时间， rttvar是rtt的平均偏差。单位是ms  
ato  ack超时时间， 单位ms, 用于延迟ack  
mss  发送方向的mss,单位byte   rcvmss是评估的接收方的mss advmss  
cwnd 拥塞窗口大小，单位是mss   比如 10 代表 10*mss == 10 * 1460 == 14600 bytes  
ssthresh 慢启动阈值， 单位是mss  
bytes_sent  bytes_acked  bytes_received  迄今为止发送的，ack的，收到的字节数（不含ip, tcp header）。send 表示已发到L3层。  
segs_out，segs_in，data_segs_out，data_segs_in的单位都是seg。data_segs_out只统计含有数据（不算header）的包， segs_out统计
所有发送包。data_segs_in与segs_in的区别同理。  
lastsnd lastrcv lastack 上一次发送，接收，ack到现在的时长。 单位ms  
send pacing_rate delivery_rate 单位是 bit/s, send是根据当前的拥塞窗口评估出来的（即想以xx的速率发送， 但其实可能受各种因素限制）。
pacing_rate 通常是send的两倍，delivery_rate 通过在收到Ack时利用已经发送且对端已收到的包来评估速率。  
unacked  等于tp->packets_out， 已发送未acked的包，单位：seg  
retrans  第一个等于tp->retrans_out，当前仍在重传的包（未acked)。第二个等于tp->total_retrans，历史上重传过的包。单位seg  
lost     等于tp->lost_out，单位：seg  
sacked   等于tp->sacked_out，单位：seg  
dsack_dups  收到的dsack包， 单位：seg  
reordering  
reord_seen  
rcv_rtt  最近一次采样的rtt    
rcv_space  采样时用户态最大的拷贝字节数  
rcv_ssthresh 单位：字节数  
not_sent  在发送队列里，但还没有发送到L3的字节数（不含IP，TCP头）  
minrtt 最小的rtt值，单位ms  
snd_wnd  通过对端报文里的window和snd_wscale计算出来  
rcv_wnd  
``` c
static void tcp_update_pacing_rate(struct sock *sk)
{
	const struct tcp_sock *tp = tcp_sk(sk);
	u64 rate;

	/* set sk_pacing_rate to 200 % of current rate (mss * cwnd / srtt) */
	rate = (u64)tp->mss_cache * ((USEC_PER_SEC / 100) << 3);

	/* current rate is (cwnd * mss) / srtt
	 * In Slow Start [1], set sk_pacing_rate to 200 % the current rate.
	 * In Congestion Avoidance phase, set it to 120 % the current rate.
	 *
	 * [1] : Normal Slow Start condition is (tp->snd_cwnd < tp->snd_ssthresh)
	 *	 If snd_cwnd >= (tp->snd_ssthresh / 2), we are approaching
	 *	 end of slow start and should slow down.
	 */
	if (tcp_snd_cwnd(tp) < tp->snd_ssthresh / 2)
		rate *= READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_pacing_ss_ratio);
	else
		rate *= READ_ONCE(sock_net(sk)->ipv4.sysctl_tcp_pacing_ca_ratio);

	rate *= max(tcp_snd_cwnd(tp), tp->packets_out);

	if (likely(tp->srtt_us))
		do_div(rate, tp->srtt_us);

	/* WRITE_ONCE() is needed because sch_fq fetches sk_pacing_rate
	 * without any lock. We want to make sure compiler wont store
	 * intermediate values in this location.
	 */
	WRITE_ONCE(sk->sk_pacing_rate, min_t(u64, rate,
					     sk->sk_max_pacing_rate));
}
```
``` c
// iproute2/misc/ss.c
static void tcp_show_info(const struct nlmsghdr *nlh, struct inet_diag_msg *r,
		struct rtattr *tb[])
{
		if (rtt > 0 && info->tcpi_snd_mss && info->tcpi_snd_cwnd) {
			s.send_bps = (double) info->tcpi_snd_cwnd *
				(double)info->tcpi_snd_mss * 8000000. / rtt;
		}

		if (info->tcpi_pacing_rate &&
				info->tcpi_pacing_rate != ~0ULL) {
			s.pacing_rate = info->tcpi_pacing_rate * 8.;

			if (info->tcpi_max_pacing_rate &&
					info->tcpi_max_pacing_rate != ~0ULL)
				s.pacing_rate_max = info->tcpi_max_pacing_rate * 8.;
		}
		s.delivery_rate = info->tcpi_delivery_rate * 8.;
}
```
`ss -i`的大部分信息来自内核`tcp_get_info`函数。
## TCP性能分析
通过ss -i 的结果可以帮助我们判断TCP发送性能的部分受限原因。  
busy_time 表示非空闲时间，包括发送队列一直处于忙（即发送队列一直有数据）和如下两种情况时间的总和  
rwnd_limited 表示发送速率受对端接受窗口限制的时间/百分比      
sndbuf_limited 表示发送速率受发送buffer大小限制的时间/百分比    

[原始Patch](https://lore.kernel.org/netdev/1480191016-73210-1-git-send-email-ycheng@google.com/t/#m40b206792ed684902a723dfd1e668942485db5fd)
## 参考
`struct tcp_sock` 部分字段解释：   
write_seq	已放入到write_queue里的最后一个序列号  
rcv_nxt	要接收的下一个序列号  
snd_nxt  要发送到L3层的下一个序列号  
snd_una  最后已发送未收到acked的序列号  
packets_out  已发送但未acked的包（inflight），单位seg  
sacked_out  单位seg  
lost_out  单位seg  
retrans_out  单位seg  
delivered  发送过且已acked的包，单位seg  

https://man7.org/linux/man-pages/man8/ss.8.html  
https://github.com/shemminger/iproute2/blob/main/misc/ssfilter.y  
https://unix.stackexchange.com/questions/33855/kernel-socket-structure-and-tcp-diag  