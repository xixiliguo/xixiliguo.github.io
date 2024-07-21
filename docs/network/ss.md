

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

## 参考
https://man7.org/linux/man-pages/man8/ss.8.html  
https://github.com/shemminger/iproute2/blob/main/misc/ssfilter.y  