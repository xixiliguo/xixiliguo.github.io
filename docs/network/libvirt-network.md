---
title: "Libvirt Network 笔记"
author: "Peter Wang"
tags: ["libvirt", "iptables"]
date: 2019-06-16T21:00:55+08:00
draft: falses
---

学习libvirt的网络实现方式,记录一些笔记
<!--more-->

# 如何跟踪定位iptables

## 使用trace模块
将该报文匹配的每一条规则打印出来.`man iptables-extensions`里关于trace模块的说明  

加载模块(CentOS7)
``` bash
# modprobe  nf_log_ipv4
# sysctl -w net.netfilter.nf_log.2=nf_log_ipv4
```

加载模块(CentOS6)
``` bash
# modprobe ipt_LOG
# sysctl -w net.netfilter.nf_log.2=ipt_LOG
```

必须在`raw`表增加规则,以触发trace
如下规则会追踪tcp目标端口为80的所有包.  
可通过`dmesg`或者`/var/log/messages`查看.   
生产环境使用不当可能导致严重的性能问题.  
``` bash
# iptables -t raw -I PREROUTING -p tcp --dport 3128 -j TRACE
```

物理机上用`libvirt`启动虚拟机,然后在虚拟机发起到某个ip端口为3128的包  
下面的`dmesg`的输出,可以看到网桥virbr0收到原始包后, 转发到bond0,然后再做了snat出去.  
在POSTROUTING的NAT表里SRC会替换为物理机的ip.  
```
[5121056.357116] TRACE: raw:PREROUTING:policy:3 IN=virbr0 OUT= MAC=52:54:00:da:ec:4f:52:54:00:a4:5e:56:08:00 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357126] TRACE: mangle:PREROUTING:policy:1 IN=virbr0 OUT= MAC=52:54:00:da:ec:4f:52:54:00:a4:5e:56:08:00 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357131] TRACE: nat:PREROUTING:policy:1 IN=virbr0 OUT= MAC=52:54:00:da:ec:4f:52:54:00:a4:5e:56:08:00 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=64 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357140] TRACE: mangle:FORWARD:policy:1 IN=virbr0 OUT=bond0 MAC=52:54:00:da:ec:4f:52:54:00:a4:5e:56:08:00 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=63 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357144] TRACE: filter:FORWARD:rule:2 IN=virbr0 OUT=bond0 MAC=52:54:00:da:ec:4f:52:54:00:a4:5e:56:08:00 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=63 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357147] TRACE: mangle:POSTROUTING:policy:4 IN= OUT=bond0 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=63 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
[5121056.357150] TRACE: nat:POSTROUTING:rule:3 IN= OUT=bond0 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=63 ID=14247 DF PROTO=TCP SPT=42954 DPT=3128 SEQ=3127975600 ACK=0 WINDOW=29200 RES=0x00 SYN URGP=0 OPT (020405B40402080A10B629170000000001030307)
```

## 使用log模块
log是一个target, 如下规则是指当包经过nat表,postrouting链,将源为192.168.122.0/24的包记录下来

``` bash
# iptables -t nat -A POSTROUTING -s 192.168.122.0/24 -j LOG
```
`/var/log/messages`打印如下：  
```
kernel: IN= OUT=bond0 SRC=192.168.122.17 DST=10.44.32.217 LEN=60 TOS=0x00 PREC=0x00 TTL=63 ID=62347 DF PROTO=TCP SPT=42964 DPT=3128 WINDOW=29200 RES=0x00 SYN URGP=0
```

# Libvirt 网络模型
假设物理机只有一个网卡`wlp5s0`,对应的ip为`192.168.3.5`  
虚拟机的ip为`192.168.122.8`  
## 默认NAT模式
`libvirt`默认提供nat转发模式, `virt-manager`默认调用`libvirt`也是这个模式  
这种模式下虚拟机可以访问外部网络,但外部网络无法访问虚拟机内部.


虚拟机发出去的消息,首先到网桥`virbr0`的`input`链. 允许通过的情况下,路由决策目标IP不是本机ip, 需要转发. 从`wlp5s0`出去  
``` bash
# iptables  -nvL
Chain INPUT (policy ACCEPT 45456 packets, 89M bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 ACCEPT     udp  --  virbr0 *       0.0.0.0/0            0.0.0.0/0            udp dpt:53
    0     0 ACCEPT     tcp  --  virbr0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:53
    0     0 ACCEPT     udp  --  virbr0 *       0.0.0.0/0            0.0.0.0/0            udp dpt:67
    0     0 ACCEPT     tcp  --  virbr0 *       0.0.0.0/0            0.0.0.0/0            tcp dpt:67

Chain FORWARD (policy ACCEPT 0 packets, 0 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 ACCEPT     all  --  *      virbr0  0.0.0.0/0            192.168.122.0/24     ctstate RELATED,ESTABLISHED
    0     0 ACCEPT     all  --  virbr0 *       192.168.122.0/24     0.0.0.0/0           
    0     0 ACCEPT     all  --  virbr0 virbr0  0.0.0.0/0            0.0.0.0/0           
    0     0 REJECT     all  --  *      virbr0  0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable
    0     0 REJECT     all  --  virbr0 *       0.0.0.0/0            0.0.0.0/0            reject-with icmp-port-unreachable

Chain OUTPUT (policy ACCEPT 45542 packets, 5338K bytes)
 pkts bytes target     prot opt in     out     source               destination         
    0     0 ACCEPT     udp  --  *      virbr0  0.0.0.0/0            0.0.0.0/0            udp dpt:68
```
在`postrouteing`时匹配了MASQUERADE规则,将源ip从虚拟机的ip修改为发消息出去的网卡的ip. 这里为`wlp5s0`
``` bash
# iptables -t nat -nvL
Chain PREROUTING (policy ACCEPT 3 packets, 708 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain INPUT (policy ACCEPT 2 packets, 394 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain OUTPUT (policy ACCEPT 1079 packets, 76558 bytes)
 pkts bytes target     prot opt in     out     source               destination         

Chain POSTROUTING (policy ACCEPT 1079 packets, 76558 bytes)
 pkts bytes target     prot opt in     out     source               destination         
    3   334 RETURN     all  --  *      *       192.168.122.0/24     224.0.0.0/24        
    0     0 RETURN     all  --  *      *       192.168.122.0/24     255.255.255.255     
    0     0 MASQUERADE  tcp  --  *      *       192.168.122.0/24    !192.168.122.0/24     masq ports: 1024-65535
    0     0 MASQUERADE  udp  --  *      *       192.168.122.0/24    !192.168.122.0/24     masq ports: 1024-65535
    0     0 MASQUERADE  all  --  *      *       192.168.122.0/24    !192.168.122.0/24    
```

`libvirtd`一个网络属于一个网桥,同一网络下的虚拟机的网卡在该网桥下.网桥相当与一台交换机  
虚拟机可以互访,交互的消息在物理机的iptables跟踪不动.因为消息并没有出这台交换机.  
同时`libvirtd`通过dnsmasq给所有虚拟机提供dhcp和dns服务.  
``` bash
brctl show
bridge name	bridge id		STP enabled	interfaces
virbr0		8000.5254008931ee	yes		virbr0-nic
							vnet0
							vnet1
```

## 路由模式
这种模式下对比nat模式,少了nat表的配置,其他都一样.
网桥相当与有了路由功能的交换机.
虚拟机直接使用分配的ip与外界通信. 外部网络直接访问虚拟机的ip. 
所以需要在外部配置静态路由使外面的消息能发到这台物理机  

## 隔离模式
这种模式只允许虚拟机互访. 外界包括物理机都无法访问. 应用场景很少.

## macvtap
这种模式,虚拟机直接使用物理机的网卡
``` bash
    <interface type='direct'>
      <mac address='52:54:00:26:71:4b'/>
      <source dev='enp3s0' mode='bridge'/>
      <target dev='macvtap0'/>
      <model type='virtio'/>
      <alias name='net0'/>
      <address type='pci' domain='0x0000' bus='0x00' slot='0x03' function='0x0'/>
    </interface>
```

## vhostuser
这种类型可以使虚拟机的qemu进程与另一个用户态空间交换包文.    
主要用于支持DPDK的包处理,进一步提升网络性能.  
``` bash
  <interface type='vhostuser'>
    <mac address='52:54:00:3b:83:1a'/>
    <source type='unix' path='/tmp/vhost1.sock' mode='server'/>
    <model type='virtio'/>
  </interface>
```


# 其他
如下文档是一个使用iptable配置防止DDOS工具的终极指南. 里面有大量的配置实例  
https://javapipe.com/blog/iptables-ddos-protection/  
如下文档上iptable入门指南  
https://rlworkman.net/howtos/iptables/iptables-tutorial.html  
# 参考
https://access.redhat.com/solutions/2313671   
https://www.lijiaocn.com/%E6%8A%80%E5%B7%A7/2018/06/15/debug-linux-network.html  
https://libvirt.org/formatdomain.html  
https://wiki.libvirt.org/page/Networking  
https://wiki.libvirt.org/page/VirtualNetworking  