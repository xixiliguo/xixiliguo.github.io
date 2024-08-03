

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
`closed = orphaned + timewait + others`  , 这块的others是指已经不在hash桶里的,但仍被进程占用的socket, 比如`刚创建的socket, 没有bind或者connect的`, 或者`处于FIN-WAIT-2状态keeptimer超时后的socket`.

处于`FIN-WAIT-1`状态的socket会算到 `orphaned`  
处于`FIN-WAIT-2`状态和`TIME-WAIT`的socket会算到 `timewait`  

如下对每一种TCP状态的socket统计, 上面提到的others无法统计到
``` bash
# ss -H -ta | awk '{print $1}' | sort | uniq -c
      8 ESTAB
      1 FIN-WAIT-2
      4 LISTEN
      2 TIME-WAIT
```

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
接收过程中,如果当前socket正处于进程上下文,那么包放到backlog算到back_log里,
否则放到receive_queue里,算到 rmem_alloc里,同时fwd_alloc减少

发送过程中先计算到wmem_queued里, 如果拥塞窗口允许包传递到L3层后, 那么也会计算到wmem_alloc里, wmem_alloc最终会在kfree_skb时通过调用
tcp_wfree减少
发到L3层时,通过`tcp_event_new_data_sent`函数将skb从 wwrite_queue删除, 放到 rtx_queue里(这是一个红黑树, 根据seq排序)
在接收过程中通过获取到的ack, 调用 `tcp_clean_rtx_queue` 清理已被对方Ack的skb, 最终 wmem_queued的值做相应的减少

## Recv-Q 与 Send-Q
```
State          Recv-Q          Send-Q    Local Address:Port     Peer Address:Port
LISTEN         0               1024      xxx.xxx.xxx.xxx:xxx    xxx.xxx.xxx.xxx:*
ESTAB          0               52        xxx.xxx.xxx.xxx:xxx    xxx.xxx.xxx.xxx:xxx
```
处于listen状态的socket, 队列指的是已完成TCP三次握手但进程并没有通过accept取走的连接个数, recv-q 表示当前连接个数. send-q是最大连接数  
其他状态时, recv-q 表示已到达接受队列但进程还没有取走的字节数(e.g. TCP协议的话不包括IP和TCP头), send-q表示已发送但还收到对方Ack的字节数  

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

## 参考
https://man7.org/linux/man-pages/man8/ss.8.html  
https://github.com/shemminger/iproute2/blob/main/misc/ssfilter.y  
https://unix.stackexchange.com/questions/33855/kernel-socket-structure-and-tcp-diag  