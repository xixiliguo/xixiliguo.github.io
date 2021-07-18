---
title: "理解NTP协议"
author: "Peter Wang"
tags: ["NTP", "协议"]
date: 2018-01-28T15:02:50+08:00
draft: false
---
NTP协议用来校准服务器的时间. 本文详细介绍原理和协议格式
<!--more-->

## 时钟同步的过程

1. A发送ntp消息到B, 消息里含发送时间戳 T1.  
2. B收到ntp消息后, 将接受时间T2写入该消息体.  
3. 当B发送ntp响应消息给A时, 将发送时间T3也写入该消息体  
4. A收到响应ntp消息的时间为T4  

那么  
round-trip 为: (T4 - T1) - (T3 - T2)   
时间偏移为: ((T2 - T1) + (T3 - T4)) / 2  
  
ntp请求消息和响应消息格式完全一样, 使用udp协议. 默认的ntp服务器监听端口是123  
如下chronyd(centos下默认的ntp软件)正在监听123端口
``` bash
$ lsof -i:123
COMMAND  PID   USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
chronyd 2439 chrony    3u  IPv4  23270      0t0  UDP *:ntp
```

## ntp消息格式

ntp消息由消息头,扩展字段,可选的鉴权码组成. 在实际使用中, 一般只携带消息头. 如下是消息头的具体格式
```
     0                   1                   2                   3
     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |LI | VN  |Mode |    Stratum     |     Poll      |  Precision   |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                         Root Delay                            |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                         Root Dispersion                       |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                          Reference ID                         |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                                                               |
    +                     Reference Timestamp (64)                  +
    |                                                               |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                                                               |
    +                      Origin Timestamp (64)                    +
    |                                                               |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                                                               |
    +                      Receive Timestamp (64)                   +
    |                                                               |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                                                               |
    +                      Transmit Timestamp (64)                  |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```
时间格式有两种, 它们代表从1900年1月1号 0时 UTC时间至今的秒数   

* NTP Timestamp Format  
8个字节, 前32位表示秒数, 后32位表示 `1/2的32次方` 秒  

```
     0                   1                   2                   3
     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                            Seconds                            |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |                            Fraction                           |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

* NTP Short Format  
4个字节, 前16位表示秒数, 后16位表示 `1/2的16次方` 秒   

```
     0                   1                   2                   3
     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
    |          Seconds              |           Fraction            |
    +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```
* 消息头各字段解释:    

LI Leap Indicator (leap): 2比特, 用来警告是否有闰秒或者未和上级同步. 具体取值和含义如下:
```
    +-------+----------------------------------------+
    | Value | Meaning                                |
    +-------+----------------------------------------+
    | 0     | no warning                             |
    | 1     | last minute of the day has 61 seconds  |
    | 2     | last minute of the day has 59 seconds  |
    | 3     | unknown (clock unsynchronized)         |
    +-------+----------------------------------------+
```

VN Version Number: 3比特,指定ntp版本
Mode (mode): 3比特, 指定工作模式, 通常我们使用3,4 代表客户端-服务端模式
```
    +-------+--------------------------+
    | Value | Meaning                  |
    +-------+--------------------------+
    | 0     | reserved                 |
    | 1     | symmetric active         |
    | 2     | symmetric passive        |
    | 3     | client                   |
    | 4     | server                   |
    | 5     | broadcast                |
    | 6     | NTP control message      |
    | 7     | reserved for private use |
    +-------+--------------------------+
```
Stratum (stratum): 8比特指定阶层. 通常Server更新该字段.   
顶层分配为数字0。一个通过阶层n同步的服务器将运行在阶层n + 1。  阶层为0的是高精度计时设备，例如原子钟（如铯、铷）、GPS时钟或其他无线电时钟。它们生成非常精确的脉冲秒信号，触发所连接计算机上的中断和时间戳。阶层0设备也称为参考（基准）时钟. 阶层1服务器连接阶层0的设备, 它们也被称为主要（primary）时间服务器。
![ntp阶层图](/img/ntp.svg)
更具体的取值含义如下:
```
    +--------+-----------------------------------------------------+
    | Value  | Meaning                                             |
    +--------+-----------------------------------------------------+
    | 0      | unspecified or invalid                              |
    | 1      | primary server (e.g., equipped with a GPS receiver) |
    | 2-15   | secondary server (via NTP)                          |
    | 16     | unsynchronized                                      |
    | 17-255 | reserved                                            |
    +--------+-----------------------------------------------------+
```
Poll: 8比特符号整数, 指示与下一次ntp同步的最短时间间隔. 值为4, 则表示16(2的4次方)秒  
Precision: 8比特符号整数, 指示时间精度. log2 秒.  -18 为微妙  
Root Delay: 总的 round-trip delay到 Primary server. 单位是 NTP Short Format  
Root Dispersion: 单位是 NTP Short Format  
Reference ID: 32比特指示服务端的参考时钟(即上层服务器信息). 即上层时钟源 . 当阶层为1时, 那么上层是原子钟等设备. 没IP, 所以使用ascii 字符 从阶层2开始, 表示IP地址.  
Reference Timestamp: 指示服务端自身系统时间最后一次被设置的时间戳.通常每Poll一次更新一下  
Origin Timestamp: 客户端发起时间  
Receive Timestamp: 服务端接受时间  
Transmit Timestamp: 服务端发送时间  

## 抓包实例
`tcpdump -i eth0 port 123 -nnv` 抓取ntp的详细报文, 样例如下:  
```
17:19:18.566860 IP (tos 0x0, ttl 45, id 33978, offset 0, flags [none], proto UDP (17), length 76)
    1.80.235.52.31681 > 192.168.1.247.123: NTPv4, length 48
	Client, Leap indicator: clock unsynchronized (192), Stratum 0 (unspecified), poll 3 (8s), precision -6
	Root Delay: 1.000000, Root dispersion: 1.000000, Reference-ID: (unspec)
	  Reference Timestamp:  0.000000000
	  Originator Timestamp: 0.000000000
	  Receive Timestamp:    0.000000000
	  Transmit Timestamp:   3726119958.485983999 (2018/01/28 17:19:18)
	    Originator - Receive Timestamp:  0.000000000
	    Originator - Transmit Timestamp: 3726119958.485983999 (2018/01/28 17:19:18)
17:19:18.566899 IP (tos 0x0, ttl 64, id 38707, offset 0, flags [DF], proto UDP (17), length 76)
    192.168.1.247.123 > 1.80.235.52.31681: NTPv4, length 48
	Server, Leap indicator:  (0), Stratum 3 (secondary reference), poll 3 (8s), precision -24
	Root Delay: 0.005340, Root dispersion: 0.002105, Reference-ID: 182.92.12.11
	  Reference Timestamp:  3726119511.971055101 (2018/01/28 17:11:51)
	  Originator Timestamp: 3726119958.485983999 (2018/01/28 17:19:18)
	  Receive Timestamp:    3726119958.566745462 (2018/01/28 17:19:18)
	  Transmit Timestamp:   3726119958.566777029 (2018/01/28 17:19:18)
	    Originator - Receive Timestamp:  +0.080761462
	    Originator - Transmit Timestamp: +0.080793029
```

## 相关软件使用

chronyd是centos7引入的新的ntp软件, 代替老的ntpd  
如下命令检测当前与上层ntp的同步状态  
``` bash
$ chronyc sources -v
210 Number of sources = 2

  .-- Source mode  '^' = server, '=' = peer, '#' = local clock.
 / .- Source state '*' = current synced, '+' = combined , '-' = not combined,
| /   '?' = unreachable, 'x' = time may be in error, '~' = time too variable.
||                                                 .- xxxx [ yyyy ] +/- zzzz
||      Reachability register (octal) -.           |  xxxx = adjusted offset,
||      Log2(Polling interval) --.      |          |  yyyy = measured offset,
||                                \     |          |  zzzz = estimated error.
||                                 |    |           \
MS Name/IP address         Stratum Poll Reach LastRx Last sample
===============================================================================
^* time5.aliyun.com              2  10   377   733   +165us[ +206us] +/- 5534us
^- 120.25.115.19                 2  10   377   633  -1155us[-1155us] +/-   65ms
```

使用ntpd软件包时检查ntp状态  
when指多少秒后再一次同步  
poll指下一次同步的时间间隔 单位:秒  
reach 与上层服务器已成功连接的次数  
delay 指RRT  单位: 毫秒  
offset 指时间偏移值 单位: 毫秒  
``` bash
ntpq -p
     remote           refid      st t when poll reach   delay   offset  jitter
==============================================================================
+time5.aliyun.co 10.137.38.86     2 u   11   64    1   25.353  -113.04  65.276
*203.107.6.88    10.137.55.181    2 u    9   64    1   45.441  -148.44  89.070
``` 

`ntpdate -q XX.XX.XX.XX` 查询与上层ntp服务器的时间偏移量. 不会更新.  `-d` 打开Debug模式
``` bash
$ ntpdate -q ntp3.aliyun.com
server 203.107.6.88, stratum 2, offset 0.797972, delay 0.06859
11 Feb 23:02:36 ntpdate[21763]: step time server 203.107.6.88 offset 0.797972 sec
```

ntp配置最佳实践:  
假设ntp服务器为 ntp1.aliyun.com, 配置如下:  
``` bash
# 上层服务器配置
server ntp1.aliyun.com iburst 
restrict ntp1.aliyun.com nomodify notrap nopeer noquery

# default 指所有IP, 首先默认显示连接无法执行任何操作
restrict default kod nomodify notrap nopeer noquery
# 针对ipv6的配置
restrict -6 default kod nomodify notrap nopeer noquery
# 配置内网IP可查询不可修改时间
restrict xx.xx.xx.xx mask xx.xx.xx.xx  nomodify notrap nopeer
```

`man ntp_acc` 查看 restrict 各参数含义  
`man ntp_clock` 查看 server 各参数含义  

## 参考
* NTP4 RFC: https://tools.ietf.org/html/rfc5905
* NTP Best Practice: https://tools.ietf.org/id/draft-reilly-ntp-bcp-01.html

