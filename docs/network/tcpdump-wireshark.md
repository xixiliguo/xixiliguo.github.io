---
title: "Tcpdump与Wireshark点滴记录"
author: "Peter Wang"
tags: ["NetWork"]
date: 2018-08-16T22:41:37+08:00
draft: false
---

记录Tcpdump相关知识和Wireshark技巧

<!--more-->

## tcpdump 基本介绍

### 常用语法
* 指定网卡(eth0), 如果要抓取所有网卡的包, 使用`any`   

``` bash
tcpdump -i eth0
tcpdump -i any
```

* 使用`-nnv`, 不解析协议和端口,同时多打印写详细信息(IP头)

``` bash
tcpdump -i eth0 -nnv
    10.211.55.9.22 > 10.211.55.2.63376: Flags [P.], cksum 0x84ff (incorrect -> 0x0ec3), seq 935672:935968, ack 761, win 385, options [nop,nop,TS val 102595534 ecr 1564236582], length 296
22:53:54.006694 IP (tos 0x10, ttl 64, id 59224, offset 0, flags [DF], proto TCP (6), length 52)
    10.211.55.2.63376 > 10.211.55.9.22: Flags [.], cksum 0x8bf2 (correct), ack 935672, win 8139, options [nop,nop,TS val 1564236582 ecr 102595534], length 0
22:53:54.006746 IP (tos 0x10, ttl 64, id 25202, offset 0, flags [DF], proto TCP (6), length 52)
    10.211.55.2.63376 > 10.211.55.9.22: Flags [.], cksum 0x8adc (correct), ack 935968, win 8121, options [nop,nop,TS val 1564236582 ecr 102595534], length 0
22:53:54.006895 IP (tos 0x10, ttl 64, id 57471, offset 0, flags [DF], proto TCP (6), length 924)
    10.211.55.9.22 > 10.211.55.2.63376: Flags [P.], cksum 0x873f (incorrect -> 0x2d02), seq 935968:936840, ack 761, win 385, options [nop,nop,TS val 102595534 ecr 1564236582], length 872
```

* 使用`-e`可以打印MAC地址

``` bash
tcpdump -i eth0 -e
tcpdump: verbose output suppressed, use -v or -vv for full protocol decode
listening on eth0, link-type EN10MB (Ethernet), capture size 262144 bytes
22:56:22.708510 00:1c:42:13:d0:f5 (oui Unknown) > 00:1c:42:00:00:08 (oui Unknown), ethertype IPv4 (0x0800), length 266: linux.ssh > 10.211.55.2.63376: Flags [P.], seq 3187876880:3187877080, ack 2645742059, win 385, options [nop,nop,TS val 102744236 ecr 1564384779], length 200
```

* 使用`-w`将信息保存到文件, 下列命令将包信息保存到`abc.cap`. `-C` 配合`-w`使用, 进一步指定文件的最大size, 一旦超过, 会新建文件继续写入

``` bash
tcpdump -i eth0 -w abc.cap
```

### 常用过滤语法
不带过滤器, 则默认抓取指定网卡所有的包(接受和发送)  

* 抓取所有经过eth1，目的或源地址是192.168.1.1的网络数据

``` bash
tcpdump -i eth0 host 192.168.1.1
```

* 抓取所有经过eth1，目的或源网络为192.168.XXX.XXX的网络数据

``` bash
tcpdump -i eth0 net 192.168
```

* 指定源地址或者目的地址

``` bash
tcpdump -i eth1 src host 192.168.1.1
tcpdump -i eth1 dst host 192.168.1.1
```

* 抓取所有经过eth1，目的或源端口是25的网络数据, 如果要指定过滤源端口, 可使用 `src port 25`. 目的端口类似

``` bash
tcpdump -i eth0 port 25
```

* 抓取所有经过eth1的所有icmp包, tcp, arp包语法类似

``` bash
tcpdump -i eth1 arp
tcpdump -i eth1 ip
tcpdump -i eth1 tcp
tcpdump -i eth1 udp
tcpdump -i eth1 icmp
```

* 逻辑表达式

```
非 : ! or "not" (去掉双引号)  
且 : && or "and"  
或 : || or "or"

多个表达式整体用单引号或者双引号引用起来, 单个最好用括号这样更清晰 
```

* 抓取所有经过eth1，目的网络是192.168，但目的主机不是192.168.1.200的TCP数据

``` bash
tcpdump -i eth1 '((tcp) and ((dst net 192.168) and (not dst host 192.168.1.200)))'
```

> 详细的过滤指导请参考: https://wiki.wireshark.org/CaptureFilters


## wireshark 介绍

### 显示过滤器
默认wireshark打开文件后,显示所有的包. 可以指定相应的显示过滤器, 显示特定部分  

* 比如想显示所有经过端口80的数据包, 使用 `tcp.port == 80`

* 显示所有经过 192.168这个网段的包,使用 `ip.addr == 192.168.0.0/16`

* 仍然可以组合多个过滤条件

> and, &&   逻辑与  
> or,  ||   逻辑或  
> not, !    逻辑否  


下面是具体的例子:
``` bash
tcp.port == 80 and ip.src == 192.168.2.1
not llc
http and frame[100-199] contains "wireshark"
(ipx.src.net == 0xbad && ipx.src.node == 0.0.0.0.0.1) || ip

```

* 两个特殊的过滤操作`contains` 和 `match`

`ip.addr contains "192.168"`是指过滤所有ip地址里包含"192.168"这几个字符的数据包  
`http contains "www.163.com"` 过滤所有http消息里包含"www.163.com"字符串的数据包   
`match` 用法类似, 不过它支持perl的正则表达式, 而且是大小写不敏感

`contains` 后面可以是带双引号的字符串, 字节数组, 单字节(类c语言风格). 其他的如"tcp.port" 也可以跟这些 下面的表达式都是正确的:

``` bash
"www.163.com"
56:98:47    (十六进制)
68
```
如下的过滤都是等价的:
``` bash
http.request.method == "\x47ET"
http.request.method == "GET"
http.request.method == 47.45.54
http.request.method == 47:45:54
http.request.method == 47-45-54
```
``` bash
frame.pkt_len > 10
frame.pkt_len > 012
frame.pkt_len > 0xa
frame.pkt_len > '\n'
frame.pkt_len > '\xa'
frame.pkt_len > '\012'
```

* 还有很多切片,字节操作等高级操作, 可以进一步查看如下两个文档

> https://wiki.wireshark.org/DisplayFilters  
> https://www.wireshark.org/docs/man-pages/wireshark-filter.html  


### 三板斧
处理linux主机性能问题, 我们通常有三个方面是必查的. CPU, 内存 和 IO 使用率  
通过wireshark分析网络问题, 也有类似的3个必查项  

* 统计 --> 对话

已`TCP`为例, 每一行代表一个TCP连接.他统计了流量和速率(每个方向和两个方向交互的总和)
`rel start` 是该连接上第一条TCP包与该cap文件的第一条数据的时间相对值, 勾选绝对开始时间, 可显示包发送的绝对时间. 例如`23:17:95`  

![统计-->对话框](/img/wireshark_info.png)

* 分析 --> 专家信息

Wireshark会自动分析整个文件, 然后分严重等级罗列出每一项分析结果和对应出现的次数  
一定要多关注错误和警告级别的, 根据出现的次数和文件总的`packet`数计算其出现的比例. 比如重传大于10%对性能影响就非常严重了  

![分析 --> 专家信息](/img/wireshark_expertinfo.png)

* 统计 --> TCP流图形 --> 时间序列(Steven)

该图可以显示一个TCP连接上某个方向序列号的变化, 以此查看发送性能

![统计 --> TCP流图形 --> 时间序列](/img/wireshark_tcpseq.png)


### Wireshark提示消息解释

* [Packet size limited during capture]  
表示该包没有抓全, 比如包是大小是1024, 结果tcpdump抓时只了1000. 通常这是抓包是`-s`值太小造成的
* [TCP Previous segment not captured]  
TCP连接上后一包的seq大于前一个包的seq+eln, 说明中间缺失数据. 给出这个提示
* [TCP ACKed unseen segment]  
该报文里的ACK确认的seq在整个抓包里没有找到  
* [TCP Out-of-Order]  
后一个包的seq小于前一个包的seq+len, 认为乱序
* [TCP Dup ACK]  
后一个包的ack和前一个包里的ack指一样.  
* [TCP Fast Retransmission]  
当Dup ACK发生3次, 发送端启动快速重传
* [TCP Retransmission]  
包丢且也没有触发Dup ACK, 则RTO超时过后启动重传
* [TCP zerowindow]  
win为0, 表示接受方暂时无法接受新包
* [TCP window Full]  
表示发送方已经将接受串口占满, 可对比接受方发的窗口和发送方的`byte in flight`

> 可进一步查看官方文档: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html  
> 有兴趣的话, 可以进一步查看源码: https://github.com/boundary/wireshark/blob/master/epan/dissectors/packet-tcp.c  

### 其他技巧

* 如果包在英国的某台服务器上生成, 在中国打开时, 会发现并不是英国当地的发生时间. 需要做timeshift  
在`编辑 --> 时间平移` 将时间通过`08:00:00`或者`-08:00:00`这样的格式进行调整

* 推荐两个讲解Wireshark的书:  
<< Wireshark网络分析就这么简单>> 和 << Wireshark网络分析的艺术 >>

* iRTT 与 RTT  
https://osqa-ask.wireshark.org/questions/21813/how-is-rtt-calculated  


## TCP协议

### 知识学习
这块非常复杂, 推荐如下书籍或文章:
TCP/IP详解卷1  
TCP 的那些事儿:  
https://coolshell.cn/articles/11564.html  
https://coolshell.cn/articles/11609.html  
TCP/IP Guide:  
http://www.tcpipguide.com/free/index.htm 免费电子书  


### 问题记录

* 网卡eth1收到包, 根据路由要从网卡eth0发出去, 但从抓包上却没有看到回包  
通过设置参数`net.ipv4.conf.all.rp_filter`为0 可解决 
默认为1, 是严格模式, 不允许回程路由和先前的不一样, 同时`nstat | grep IPReversePathFilter`可观察到包被丢弃后,计数器增加
具体解释看:   
https://access.redhat.com/solutions/53031  
https://www.slashroot.in/linux-kernel-rpfilter-settings-reverse-path-filtering  
https://access.redhat.com/solutions/53031  
同时可以打开内核参数`net.ipv4.conf.all.log_martians`,将OS认为的martians报文打印到系统日志里  
具体解释:  
https://serverfault.com/questions/570980/what-is-the-usefulness-of-logging-of-martians-packet-e-g-net-ipv4-conf-all-lo  


* NAT场景下内网机器配置所有消息转发到一台nat服务器上, 但有时通过`ip route get xxx` 会显示路由指向默认网关. 并且有`cache redirect`字样  
路由分为静态路由和动态的.  动态是通过智能学的, 例如`icmp`的重定向会影响的动态路由. NAT场景下要关闭ICMP的重定向功能  
``` bash
net.ipv4.conf.all.accept_redirects=0
net.ipv4.conf.all.secure_redirects=0
net.ipv4.conf.all.send_redirects=0
```

* 多网卡一般配置不同的网段, 但有时会将同一网段的IP配置在两个网卡上, 这样回复消息只会从一个网卡出去. 需要通过策略路由解决:  
为每一个网卡配置单独的路由表  
默认任意一个网卡会对自己所有的 ip 地址在 ARP 请求上作出响应, 所有对端学到的这两个IP的mac地址可能是一样的, 解决方案如下:  
``` bash
net.ipv4.conf.all.arp_announce = 2
net.ipv4.conf.all.arp_ignore = 1
```

* 经常处理tcp各种超时问题, 如下文章总结了大部分tcp下的超时情况和对应的参数控制  
http://blog.qiusuo.im/blog/2014/03/19/tcp-timeout/

* 服务端收到包, 在tcp层会校验checksum, 如果错误, 则直接丢弃该包.  用`nstat`可以看到`TcpInCsumErrors`增大  
