
# 性能优化指南
提供性能问题的分析思路和常见的原因。

## 前言
性能类问题首先要找到差异点，即对比基准测试（正常情况），观察哪些性能指标发生了巨大变化。

收集尽可能多的环境信息，缩小范围：
* 虚拟机还是物理机，具体的规格。
* OS版本（特别是内核版本）。
* k8s环境，网络和存储模型，POD的resource(cpu,memory)配置，容器镜像版本。
* 中间件版本（比如jre, 与mysql,redis交互使用的库）。
* 业务软件版本，配置文件。
* 压测时客户端的输入参数，并发数， tps等。

性能瓶颈有两种：
1. util 使用率，在资源有限的情况下使用程度接近limit, 比如cpu 100%。
2. latency 延迟， 整体响应=请求等待+请求处理时间。请求等待是非必需的，尽量缩短。

## 虚拟化
常见的性能下降原因：
1. 降频
2. 超分
3. 范围绑核
4. 内存带宽

kvm需要观察vmexit的次数。

### 降频
负载不高时，CPU频率可达到睿频，但当整体功耗超过一定值就会降到基频。
降频发生的场景：
1. 宿主机vpu对应的物理cpu socket整体CPU使用率高，接近满载。
2. 虚拟机里自身应用使用向量指令（比如intel的avx512）

场景1是整体物理核负载高。  
场景2是自身原因导致，avx512这种向量指令需要更多的power   
一旦降频，整个物理核下面运行的虚拟机都会受到影响，叫做扰邻。  

参考：  
https://serverfault.com/questions/1064327/can-intel-turbo-boost-frequency-for-all-cores-be-lower-than-the-base-frequency  
https://blog.cloudflare.com/on-the-dangers-of-intels-frequency-scaling/  


在支持pmu的环境下，可执行`perf stat yes>/dev/null`(执行5s后按ctrl+c停止)，能实测当前的cpu频率。 

内存带宽， intel 提供rdt来支持统计。

关闭超线程能提升单cpu处理能力。

虚拟化场景开启mwait可以让mwait指令不陷入到vm-exit，减少latency。

## CPU/内存


usr 说明cpu耗在用户态程序上面的百分比。  
sys 说明cpu耗在内核态上面的百分比。  

load average 负载，是估算值。 load 约等于 处于R状态的进程数+ 处于D状态的进程数。因为负载的采集周期是5s，所以性能监控软件的采样频率要小于5s，这样每个进程的状态能观察的更准确些。 

user,sys, hi, si 等cpu持续高，可直接使用perf采样，分析热点函数。
```
perf record -ag sleep 10
perf report                  
```

iowait 解释:    
iowait%  计算的是在cpu空闲状态时，同时有io等待。  
但是 io等待可以发生在空闲状态， 也可以发生在忙的状态。  


内存紧张时会触发回收，如果是直接回收会直接阻塞当前的进程。需要重点关注`/proc/vmstat`里的pgscan，pgsteal等指标。


高内核在amd CPU上面可能出现性能下降的情况，需要关闭安全相关的内核参数。 

如果只有某个core或者某个numa高，user和sys都高，可能是硬件的原因。  

## 网络

单纯的网络测速，可使用`iperf`或者`wget xxxx >/dev/null`。 这样避免了落盘的干扰。


### 网卡多队列
多队列可以极大地提升网络性能，特别是发现单核cpu si非常高，且对应的ksoftirq进程cpu很高的情况。   
OS层面可以继续打开RPS，XPS等特性，进一步提升性能。https://docs.kernel.org/networking/scaling.html，  但如果网卡队列数>=CPU数目，则没必要使用RPS。  

tcp buffer 要大于等于 带宽时延积， 带宽的单位是 Gb/s, 时延可使用ping获取。  

网卡rx方向慢考虑两方面：
1. 单核cpu使用率近乎100%， 影响该cpu上面ksoftirq的调度。
2. slab内存多， 可运行`echo 2 >/proc/sys/vm/drop_cache`后观察

如何分析wireshark里的单个TCP连接的发送性能，利用tcptrace。  
https://www.packetsafari.com/blog/2021/10/31/wireshark-tcp-graphs    


### 常见的丢包点

ip -s -s link 查看网卡层面是否有 error,drop,missed等   

/proc/net/softnet_stat 查看软中断是否丢包， 第二列表示软中断的丢包数  

/proc/net/stat/arp_cache 里倒数第一列，第二列， 如果有值，代表有丢包发生。  

tc -s qdisc show dev eth0 关注 dropped 字段是否非零  

### TCP重传
重传发生时，说明网络有丢包/乱序  

nstat -r -z 可查询大量关于网络指标的计数

sys重传  TcpExtTCPSynRetrans 增加， TcpRetransSegs 增加    
sys-ack重传  TcpExtTCPSynRetrans 增加， TcpRetransSegs 增加。只能通过kprobe， tracepoint tcp_retransmit_synack 跟踪来确定到底是syn还是syn-ack重传     
RTO重传，没有准确的计数     
TcpRetransSegs == TcpExtTCPSlowStartRetrans + TcpExtTCPFastRetrans + TcpExtTCPSynRetrans + RTO重传的包 + 部分TcpExtTCPLossProbes

参考：https://arthurchiao.art/blog/tcp-retransmission-may-be-misleading   

### TcpInErr

该计数增长，意味着rx方向有丢包，分三种情况：
1. checksum校验不通过，可通过`TcpInCsumErrors`确认。
2. 已经处于`ESTAB`状态的TCP连接，再次收到syn报文， 可通过 `TcpExtTCPSYNChallenge` 确认。
3. 数据实际`size`小于TCP包头。


### 内核参数

net.ipv4.tcp_slow_start_after_idle配置为0，可使空闲连接再次发包时不再慢启动。

使用bbr算法时，必须调整tc调度，配置为fq_codel

net.ipv4.tcp_mem 控制整个系统所有TCP buffer，单位是页。 如果连接特别多，可能达到压力阈值而降速。/proc/net/sockstat 可查实际值


## 磁盘IO


### 磁盘调度
/sys/block/vda/queue/scheduler 记录当前生效的调度算法。

### 多队列

/sys/block/vda/mq下面只有一个文件夹，名字为0，则是单队列，否则为多队列。 比如有4个文件夹，分别是 0,1,2,3.那么
就是4个队列。


### 其他
iostat里的util只能说明磁盘繁忙度，单看 100%并不一定有瓶颈。还要继续看await, await == IO在内核里排队调度 + IO在存储设备处理时间。是准
确值。 在单队列的磁盘上面， svctm可以看做io在底层处理时间。但如果是多队列，值不准。    
可以使用blktrace分析IO在每个阶段的准确耗时。    
oracle物理机场景，发现磁盘调度改为none性能会更好。   
磁盘有预读功能， 可使用 /sys/block/sda/queue/read_ahead_kb 查询当前值  


## 文件系统

ext4 如果在数据T级时发现性能慢，可用perf分析耗时高的函数

nfs 一个挂载点对应一个TCP连接。架构限制，没有太多优化手段

## 容器

影响POD内进程性能的常见因素：
1. POD CPU 限流，  可通过busrt特性缓解
2. CPU绑核，  可通过kubelet配置， 设置绑核其实就是亲和性， 是否生效可通过`/proc/<pid>/status`里的Cpus_allowed_list确认
3. 应用cgroup感知
容器里进程查询到的cpu/memory信息是node的，不是spec resource里的request,limit值。这样误以为资源很多，其实受cgroup限制。经常启动与node
节点cpu数据相同的线程数，但经常收到cgroup limit的限制。 发生限流或者内存较高的情况。   
高版本的java,golang已实现cgroup感知。 
