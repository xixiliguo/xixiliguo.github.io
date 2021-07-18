---
title: "Linux 网卡多队列介绍"
author: "Peter Wang"
tags: ["RSS", "多网卡队列"]
date: 2019-04-07T10:05:29+08:00
draft: false
---
单CPU处理网络IO存在瓶颈, 目前经常使用网卡多队列提高性能.

<!--more-->

通常情况下, 每张网卡有一个队列(queue), 所有收到的包从这个队列入, 内核从这个队列里取数据处理. 该队列其实是ring buffer(环形队列), 内核如果取数据不及时, 则会存在丢包的情况.  
一个CPU处理一个队列的数据, 这个叫中断. 默认是cpu0(第一个CPU)处理. 一旦流量特别大, 这个CPU负载很高, 性能存在瓶颈. 所以网卡开发了多队列功能, 即一个网卡有多个队列, 收到的包根据TCP四元组信息hash后放入其中一个队列, 后面该链接的所有包都放入该队列. 每个队列对应不同的中断, 使用irqbalance将不同的中断绑定到不同的核. 充分利用了多核并行处理特性. 提高了效率.  

### 多网卡队列实现图例
```                                                                                                             
             普通单队列                                   
   +-----------------------------+                        
   | queue                       |                        
   |                             |                        
   |   +----------+  +----------+|           +---------+  
   |   |  packet  |  |  packet  ||---------->|  CPU 0  |  
   |   +----------+  +----------+|           +---------+  
   +-----------------------------+                        
                                                    
                             开启多网卡队列               
                                                        
    +----------------------------+                       
    | queue                      |                       
    |                            |                       
    |  +----------+ +----------+ |           +---------+ 
    |  |  packet  | |  packet  | |---------> |  CPU 0  | 
    |  +----------+ +----------+ |           +---------+ 
    +----------------------------+           +---------+ 
                                             |  CPU 1  |  
                                             +---------+  
                                             +---------+  
    +----------------------------+           |  CPU 2  |  
    | queue                      |           +---------+  
    |                            |                        
    |  +----------+ +----------+ |           +---------+  
    |  |  packet  | |  packet  | |---------> |  CPU 3  |  
    |  +----------+ +----------+ |           +---------+  
    +----------------------------+                        
```


### 检查中断与对应的CPU关系
如下显示, 第一列是中断号, 后面两列是对应CPU处理该中断的次数, virtio-input和 virtio-output为网卡队列的中断
可见大部分包被CPU1处理

``` bash
# cat /proc/interrupts | egrep 'CPU|virtio.*(input|output)'
           CPU0       CPU1
 27:          7      89632   PCI-MSI-edge      virtio3-input.0
 30:          2          0   PCI-MSI-edge      virtio3-output.0
 31:          7      23319   PCI-MSI-edge      virtio3-input.1
 32:          2          0   PCI-MSI-edge      virtio3-output.1
```
查询具体中断所绑定的CPU信息  
smp_affinity_list显示CPU序号. 比如 0 代表 CPU0, 2代表 CPU2
smp_affinity 是十六进制显示. 比如 2 为10, 代表 CPU1 (第二个CPU)
``` bash
# for i in {30..32}; do echo -n "Interrupt $i is allowed on CPUs "; cat /proc/irq/$i/smp_affinity_list; done
Interrupt 30 is allowed on CPUs 0
Interrupt 31 is allowed on CPUs 1
Interrupt 32 is allowed on CPUs 0
```

### RPS, XPS, RFS
之前谈的多网卡队列需要硬件实现, RPS则是软件实现,将包让指定的CPU去处理中断.  
配置文件为`/sys/class/net/eth*/queues/rx*/rps_cpus`. 默认为0, 表示不启动RPS
如果要让该队列被CPU0,1处理, 则设置 echo "3" > /sys/class/net/eth*/queues/rx*/rps_cpus,  3代表十六进制表示11, 即指CPU0和CPU1  
在开启多网卡队列RSS时, 已经起到了均衡的作用.  RPS则可以在队列数小于CPU数时, 进一步提升性能. 因为进一步利用所有CPU. 
RFS则进一步扩展RPS的能力, 它会分析并将包发往最合适的CPU(程序运行所在的CPU).
检查当前RPS, RFS开启情况:
``` bash
# for i in $(ls -1 /sys/class/net/eth*/queues/rx*/rps_*); do echo -n "${i}:  "  ; cat ${i}; done
/sys/class/net/eth0/queues/rx-0/rps_cpus:  3
/sys/class/net/eth0/queues/rx-0/rps_flow_cnt:  4096
/sys/class/net/eth0/queues/rx-1/rps_cpus:  3
/sys/class/net/eth0/queues/rx-1/rps_flow_cnt:  4096
# cat /proc/sys/net/core/rps_sock_flow_entries
8192
```
XPS是将发送包指定到CPU, 通常和同一队列的rps和xps配置一致.   
``` bash
# for i in $(ls -1 /sys/class/net/eth*/queues/tx*/xps_cpus); do echo -n "${i}:  "  ; cat ${i}; done
/sys/class/net/eth0/queues/tx-0/xps_cpus:  3
/sys/class/net/eth0/queues/tx-1/xps_cpus:  3
```

### 根据top输出查看软中断负载
top进入交互式界面后, 按1 显示所有cpu的负载. si 是软中断的CPU使用率. 如果高比如50%, 说明该CPU忙于处理中断, 通常就是收发网络IO
```
top - 18:58:33 up 16 days, 19:58,  2 users,  load average: 0.00, 0.01, 0.05
Tasks:  89 total,   2 running,  87 sleeping,   0 stopped,   0 zombie
%Cpu0  :  1.3 us,  0.0 sy,  0.0 ni, 98.7 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
%Cpu1  :  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
KiB Mem :  3880032 total,  2911912 free,   199600 used,   768520 buff/cache
KiB Swap:        0 total,        0 free,        0 used.  3411892 avail Mem
```
### 参考
https://www.kernel.org/doc/Documentation/IRQ-affinity.txt  
https://www.kernel.org/doc/Documentation/networking/scaling.txt  
https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/performance_tuning_guide/sect-red_hat_enterprise_linux-performance_tuning_guide-networking-configuration_tools#sect-Red_Hat_Enterprise_Linux-Performance_Tuning_Guide-Configuration_tools-Configuring_Receive_Packet_Steering_RPS  
https://lwn.net/Articles/370153/  
https://lwn.net/Articles/412062/  
