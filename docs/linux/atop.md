---
title : "ATOP工作原理总结"
---

# ATOP工作原理总结
ATOP是一款用于观察Linux性能的ASCII全屏交互式工具。类似于top,每隔一段时间报告 `CPU，Memory，Disk，Network` 等硬件的性能信息，对于严重过载的资源会高亮显示。 除此之外，还包括进程级的相关统计信息。比如进程的CPU、内存、磁盘利用率，用户名，进程状态，启动时间，进程ID等。对于在上一个周期内退出的进程还会显示退出状态码。所有进程信息默认按CPU占用率降序排列。

## 运行方式
`atop 3`可以按每3秒刷新一次的频率在ASCII屏幕上显示即时性能信息，结果如下图。 可以实时了解当前系统的负载情况，同时具有很强的交互性。比如按键盘上的`c`可显示运行进程的完整名称（包括参数）。按键`m`可以按内存利用率降序排序当前进程列表，称之为内存视图。
![abc](/img/atop.png)

`atop -a -w /var/log/atop/atop_{HOSTNAME}_20151123 30`则每30秒记录一次数据并持久化到atop_{HOSTNAME}_20151123文件里。这样的命令通常被定时任务拉起。当服务器在特定时间点出现异常或者想要查看近几天内的性能信息时，就可以使用`atop -r FileName`读取文件并查看里面的性能数据。这里列出文件的一些默认设置

* 性能收集时间间隔：30s
* 文件名：atop_HOSTNAME_CURDAY
* 文件保存天数：7days
* 文件保存目录：/var/log/atop
* 执行ATOP的定时任务脚本：/etc/cron.d/atop

安装atop后主机上每天都会产生对应的atop文件，但我们执行`crontab -l`却找不到与atop相关的定时任务，其实它在/etc/cron.d下面。

>AAA:~ # cat /etc/cron.d/atop  
>0 0 * * * root /etc/atop/atop.daily


cron进程先在`/var/spool/cron/tabs`目录下搜索以用户名命名的文件，找到就读到内存中，其内容就是`crontab -l`的输出。接着继续搜索`/etc/crontab`和 `/etc/cron.d`目录下的所有文件并读取之。其格式和`tabs`下的略有不同，主要区别是指定了脚本的执行用户。

## 原始信息收集
`/proc`是Linux下一种虚拟文件系统，存储的是当前内核运行状态的一系列特殊文件，用户可以通过查看这些文件了解系统硬件及当前正在运行进程的信息。ATOP正是从`/proc`下各种文件中读取原始信息，通过采样来计算周期内的即时数据。比如A时间点记录下消耗在用户态的cpu时间和总的CPU时间为`M`，`X`。在B时间点记录下此两项对应的值为`N`，`Y`。则当前的用户态CPU使用率为`(N-M)/(Y-X)`。等所有的性能信息都计算加工完毕后,使用libncurses库提供的函数将最终信息打印在字符界面上。

`/proc`里记录的统计信息（除内存）都是自设备启动以来或者进程启动以来的累积值。如果没具体说明，则本文所讲到的各字段的值默认都是差值,即当前时间点采样值减去先前时间点的采样值.

本文所有示例在`Suse11`环境下通过，atop版本为`1.27`。示例中数据仅为说明，一些影响阅读且与本文无关的内容会删除。如果想要全面了解/proc文件系统里文件含义，可以`man 5 proc`

## CPU
读取`/proc/stat`获取CPU的统计信息，包括每个CPU和总的CPU信息。

>AAA:~ # cat /proc/stat  
>cpu  3870117 23378 3233296 139792496 2051527 159950 29648 0 0  
>cpu0 1903376 11614 1577768 70138672 1000644 81353 12021 0 0   
>cpu1 1966740 11763 1655527 69653824 1050882 78597 17626 0 0  
>....  
>btime 1447557115  
>processes 3543228  
>procs_running 1  
>procs_blocked 0

cpuN行后面的数值含义从左到右分别是：user，nice，system，idle，iowait，irq，softirq，steal，guest。单位为jiffies，该值等于`1/hertz`秒。`hertz`在大部分系统里为100。可以用如下命令查询：

>AAA:~ # getconf -a | grep TCK  
>CLK_TCK                            100

那么当前每个CPU的利用率为：`CPU usage = (total - idle - iowait) / total`  `total`为cpuN这一行所有值之和.

顺便介绍下其他几个比较有用的字段含义：

* btime：记录系统开机启动时距1970年1月1号多少秒
* processes (total_forks)：自系统启动以来所创建的任务的数目
* procs_running：当前处于运行队列的进程数
* procs_blocked：当前被阻塞的进程数

## Memory Swap
读取`/proc/meminfo`获取内存统计信息，读取`/proc/vmstat`获取页交换信息。
在高负荷的服务器里当内存不够用时，OS会将本应写入内存的数据写入到Swap空间，等内存充足时再将SWAP内的数据交换到内在里。内存和Swap 的这种交换过程称为页面交换（Paging），单位为页，大小是4K。
在PAGE这行 `swout`字段显示一秒中有多少页写入Swap。如果这个值超过10，则内存资源会红色高亮显示。只要该值`11 <= X < 10`，则表明当前物理内存已经不足，有页交换操作。ATOP会以青灰色高亮内存资源，表示已经出现瓶颈但不是特别严重。

* 计算公式为： `swouts / nsecs`
* swouts 从 `/proc/vmstat` 的 `pswpout`字段获得
* nescs为采样的时间间隔

系统自带的`vmstat`命令也可以观察到`SWAP`的交换情况，它正是通过读取`/proc/vmstat`来获取页交换信息的

>AAA:~ # strace -ftT -e trace=open vmstat >/dev/null  
>09:36:16 open("/etc/ld.so.cache", O_RDONLY) = 3 <0.000015>  
>09:36:16 open("/lib64/libc.so.6", O_RDONLY) = 3 <0.000014>  
>09:36:16 open("/proc/meminfo", O_RDONLY) = 3 <0.000027>  
>09:36:16 open("/proc/stat", O_RDONLY)   = 4 <0.000018>  
>09:36:16 open("/proc/vmstat", O_RDONLY) = 5 <0.000018>  
>  
>AAA:~ # cat /proc/meminfo   
>MemTotal:        7669188 kB  
>MemFree:         1909052 kB  
>Buffers:          424088 kB  
>Cached:          3670052 kB  
>....  
>SwapCached:            0 kB  
>SwapTotal:       8393920 kB  
>SwapFree:        8393920 kB  
>Mapped:           681904 kB  
>....  
>Shmem:            736624 kB  
>Slab:             178552 kB  
>SReclaimable:     139164 kB

上述meminfo文件字段解释：

* MemTotal：所有可用RAM大小（即物理内存减去一些预留位和内核的二进制代码大小）
* MemFree：被系统留着未使用的内存
* Buffers：用来给文件做缓冲大小
* Cached：被高速缓冲存储器（cache memory）用的内存的大小
* SwapTotal: 交换空间的总大小
* SwapFree: 未被使用交换空间的大小
* Slab: 内核数据结构缓存的大小，可以减少申请和释放内存带来的消耗。
* SReclaimable:可收回Slab的大小
* Shmem: 共享内存大小

内存利用率的公式为：`(MemTotal - MemFree - Cached - Buffers) / MemTotal`. Shmem这部分内存是包含在Cache里的，其实它是无法被回收的。 所以从ATOP2.0版本开始，该利用用率公式变为：`(MemTotal - MemFree - Cached - Buffers +　Shmem) / MemTotal` . 这个结果已经非常准确了。

Swap利用率公式为：`(SwapTotal - SwapFree) / SwapTotal`

## Disk
读取/proc/diskstats获取磁盘信息。从左至右分别对应主设备号，次设备号和设备名称。后续的11个列解释如下，除了第9个列外所有的列都是从启动时的累积值。
```
AAA:~ # cat /proc/diskstats 
    8       0 sda 139119 267262 3848795 1357456 3942149 4733328 62031044 62148876 0 36083024 63502552
    8       1 sda1 27 415 1388 472 0 0 0 0 0 452 472
    8       2 sda2 83999 87253 1992917 588124 883514 1359683 17920106 16570224 0 6728052 17157604
    8       3 sda3 4 0 14 84 0 0 0 0 0 84 84
    8       5 sda5 49767 174838 1493156 706492 1414495 2617855 32228098 19276908 0 14162008 19981604
    8       6 sda6 5257 4121 359986 60828 726761 755790 11882840 13347236 0 6084640 13407536
    8       7 sda7 20 194 428 508 0 0 0 0 0 496 508
    8       8 sda8 21 405 426 604 0 0 0 0 0 400 604
    7       0 loop0 0 0 0 0 0 0 0 0 0 0 0
```

* 第1列：读磁盘的次数，成功完成读的总次数。
* 第2列：合并读次数，为了效率可能会合并相邻的读和写。从而两次4K的读在它最终被处理到磁盘上之前可能会变成一次8K的读，才被计数（和排队），因此只有一次I/O操作。这个域使你知道这样的操作有多频繁。
* 第3列：读扇区的次数，成功读过的扇区总次数。
* 第4列：读花费的毫秒数，这是所有读操作所花费的毫秒数（用__make_request()到end_that_request_last()测量）。
* 第5列：写完成的次数，成功写完成的总次数。
* 第6列：合并写次数
* 第7列：写扇区的次数，成功写扇区总次数。
* 第8列：写花费的毫秒数，这是所有写操作所花费的毫秒数（用__make_request()到end_that_request_last()测量）。
* 第9列：I/O的当前进度，只有这个域应该是0。当请求被交给适当的request_queue_t时增加和请求完成时减小。
* 第10列：花在I/O操作上的毫秒数，这个域会增长只要field 9不为0。
* 第11列：加权， 花在I/O操作上的毫秒数，在每次I/O开始，I/O结束，I/O合并时这个域都会增加。这可以给I/O完成时间和存储那些可以累积的提供一个便利的测量标准。

下面表格列出常用字段的计算方法，表中的`第X列`是指`/proc/diskstats`文件里的对应列的差值（即两次采样点所得值的差值）

| ATOP字段    | 含义   |  计算公式 |  单位 |
| :--------   | :-----  | :----  |  :----  | 
| MBr/s | 平均每秒读数据量 |   第3列 * 2 / 1024 / nsecs  | MB/s |
| MBw/s |  平均1秒内写数据量 |  第7列* 2 / 1024 / nsecs  |  MB/s |
| avio     | IO操作的平均操作时长 |   第10列 / iotot   | ms |
| avq |  平均阵列深度，即加权后的IO操作时长  |  第11列/iotot  |  ms |
| busy |磁盘利用率 |   第10列 / mstot |  百分比 |

* nsecs：采样时间间隔
* iotot：读写次数之和，即第1列+第5列
* mstot：利用CPU数据计算的平均间隔时间，单位是毫秒。公式为`cputot * 1000  / hertz / nrcpu`
* cputot：两次采样点之间所有cpu的消耗时间之和, 单位是 jiffies
* hertz：100  表示1秒内有100个jiffies
* nrcpu：主机CPU个数

如果avq远大于avio,则说明IO大部分消耗在等待和排队中，而不是数据传输本身。
## Network
读取/proc/net/dev获取所有网卡信息

>AAA:~ # cat /proc/net/dev  
>Inter-|   Receive                                                |  Transmit  
>    face |bytes    packets errs drop fifo frame compressed multicast|bytes    packets errs drop fifo colls carrier compressed  
>    lo:5993298914 41500939    0    0    0     0          0         0 5993298914 41500939    0    0    0     0       0          0  
>    eth0:       0       0    0    0    0     0          0         0        0       0    0    0    0     0       0          0  
>    eth4:46036327  544231    0    0    0     0          0         1 31411179   41268    0    0    0     0       0          0  
>    eth5:48454032  556137    0    0    0     0          0     30920  3808752    7778    0    0    0     0       0          0  
>    eth2: 7766519  106577    0    0    0     0          0      3428   531166    7950    0    0    0     0       0          0  
>    eth3:50947490  669306    0    0    0     0          0     30980      680       8    0    0    0     0       0          0  
>    bond1:94490359 1100368    0    0    0     0          0     30921 35219931   49046    0    0    0     0       0          0  
>AAA:~ #

* 最左边的表示接口的名字，Receive表示收包，Transmit表示发包。
* bytes：收发的字节数
* packets：表示收发正确的包量
* errs：表示收发错误的包量
* drop：表示收发丢弃的包量
* 上面四个值是自网卡启动以来的累积值, 执行`ifconfig ethX down;ifconfig ethX up`会清零这些值

网卡的带宽和双工模式并不是从`/proc`读取，而是通过类似下面的代码获取。
```c
#include <string.h>
#include <stdio.h>
#include <sys/ioctl.h>
#include <linux/ethtool.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <linux/sockios.h>
#include <linux/if.h>
int main(int argc, char **argv) {
    int sockfd;
    struct ifreq ifreq;
    struct ethtool_cmd 	ethcmd;
    sockfd = socket(AF_INET, SOCK_DGRAM, 0);
    memset(&ifreq,  0, sizeof ifreq);
    memset(&ethcmd, 0, sizeof ethcmd);
    strncpy((void *)&ifreq.ifr_ifrn.ifrn_name, "eth4",
                    sizeof ifreq.ifr_ifrn.ifrn_name-1);
    ifreq.ifr_ifru.ifru_data = (void *)&ethcmd;
    ethcmd.cmd = ETHTOOL_GSET;
    ioctl(sockfd, SIOCETHTOOL, &ifreq);
    printf("speed is %d Mb, mode is %s duplex\n",ethcmd.speed,ethcmd.duplex ? "Full" : "Half");
    return 0;
}
```

[这篇文章](http://www.linuxjournal.com/node/6908/)详细地介绍了ETHTOOL 这个操作，只需要配合ioctl就可以获得网卡的全部信息。Linux下的ethtool工具也是通过这种方式查询网卡驱动和配置信息。

>AAA:~ # strace -ftT -e trace=ioctl ethtool eth4 >/dev/null  
>11:31:48 ioctl(1, SNDCTL_TMR_TIMEBASE or TCGETS, 0x7fffca09bb30) = -1 ENOTTY (Inappropriate ioctl for device) <0.000012>  
>11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 <0.000017>  
>11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 <0.000012>  
>11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 <0.000025>  
>11:31:48 ioctl(3, SIOCETHTOOL, 0x7fffca09cb10) = 0 <0.000027>  
>AAA:~ # 

网卡利用率的计算方法如下：
全双工： 获取rbytes与wbytes中的最大值A, curspeed = A * 8 / 1000 
单双工： curspeed = (rbytes + wbytes) * 8 / 1000 
最终利用率的公式： curspeed / （网卡带宽 * 1000）

> rbytes和wbytes是从/proc/net/dev读取  `* 8` 是把 bytes 转化为 bit,  `/ 1000` 单位变为 Kb, 通过SIOCETHTOOL获得的带宽是Mb, 所以 `* 1000` 转换为Kb

# 过载资源高亮
atop预设了针对每个资源（如CPU，Memory)的阈值， 如果当前利用率超过了阈值，则会将该资源红色高亮显示。 当达到阈值的80%时，使用青灰色高亮显示。这些值可以用户自定义。如下是资源及对应的默认阈值：

| 资源  | 阈值   |
| :--------   | :-----  |
| CPU | 90% |
| 内存 |  90% |
| Swap    | 80% |
| 磁盘 |  70% |
| 网卡 |90% |

默认进程列表是按CPU排序的。按`A`会自动依照当前过载最严重的资源排序当前进程列表。如何检测谁是最严重过载的资源。做法是将每个资源自身的利用率进行加权处理(即除以自身的过载阈值），然后选择最大的那个。举例如下：

| 资源  | 当前利用率   | 加权公式 | 加权结果
| --------  | :-----:  |:-----:  |-----:  |
| CPU | 70% |70% / 90% | 77%
| 内存 |  90% |90% / 90%| 100%
| Swap    | 0% |70% / 80% | 0%
| 磁盘 |  80% |80% / 70% |  114%
| 网卡 |20% |20% / 90% |  22%

这样ATOP判断当前最严重过载的资源是磁盘，则进程按磁盘利用率降序排列。我们经常遇到的都是高负载服务器，使用`A`能自动判断当前资源瓶颈在哪块，并显示导致相关资源极度紧张的TOP进程。对排查问题很有帮助。这里有一种特殊情况，当最严重过载资源是内存且加权后低于70%， 则仍按CPU排序。
```c
/*
** if the system is hardly loaded, still CPU-ordering of
** processes is most interesting (instead of memory)
*/
if (highbadness < 70 && *highorderp == MSORTMEM)
        *highorderp = MSORTCPU;
```