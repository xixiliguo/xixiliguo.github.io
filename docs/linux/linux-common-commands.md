---
title: "Linux 下常用命令与技巧汇总"
---

# Linux 下常用命令与技巧汇总
收集自己常用到的linux命令与技巧,方便后续查找.不定期更新.


## 1. 查询系统准确的启动时间
``` bash
date -d "$(awk -F. '{print $1}' /proc/uptime) second ago" +"%Y-%m-%d %H:%M:%S"
2018-01-17 22:27:55
```
``` bash
who -b
         system boot  2018-01-17 22:27
```
``` bash
uptime -s
2019-09-04 00:40:58
```

## 2. 查询所有进程的准确启动时间和运行时长
-e 表示查询所有进程  
-o 表示按指定的格式输出  
lstart 为进程启动时间  
etime可以显示已经运行了多长时间  
args 为具体的命令行参数  
``` bash
ps -e -o pid,lstart,etime,args
```
`ps -efL` 加 `-L` 则显示线程  

TOP5 线程最多的进程列表
``` bash
ps -eL -o pid,ppid,state,command | sort | uniq -c | sort -n -k1 | tail -5
``` 
## 3. 设置时间
``` bash
date -s "dd/mm/yyyy hh:mm:ss"
```
也可以在centos7下使用
``` bash
timedatectl set-time "2012-10-30 18:17:16"
```

## 4. 同步OS与硬件时间
将OS系统时间同步到硬件(RTC)
``` bash
hwclock –-systohc
```
将硬件时间同步到OS
``` bash
hwclock --hctosys
```

## 5. 查看硬件信息

``` bash
lscpu               #查看CPU信息
lspci               #查看PCI信息
lsusb               #查看外设USB
lsscsi              #查看SCSI设备
lsblk               #查看块设备
dmidecode -t memory #查内存槽位信息. 不跟 -t , 查全量processor, Memory, BIOS
```

## 6 锁定文件,不被任何程序修改
chattr 可以改变文件扩展属性, `chattr +i` 可以防止任何程序修改该文件. 即使有root权限.  
常用于锁定dns配置,防止dhcp程序自动修改. `lsattr` 查看当前的扩展属性. `man chattr` 查看所有参数含义.  
``` bash
chattr +i /etc/resolv.conf
```

## 7. stat 查看文件详细元数据信息, 特别是inode
``` bash
$ stat messages
  File: ‘messages’
  Size: 0         	Blocks: 0          IO Block: 4096   regular empty file
Device: fd01h/64769d	Inode: 528438      Links: 1
Access: (0600/-rw-------)  Uid: (    0/    root)   Gid: (    0/    root)
Context: system_u:object_r:var_log_t:s0
Access: 2018-01-14 21:32:01.977218590 +0800
Modify: 2018-01-14 21:32:01.977218590 +0800
Change: 2018-01-14 21:32:01.977218590 +0800
 Birth: -
```

## 8. xxd查看二进制文件
-s 指定起始位置(不指定则从0开始),  -l 指定打印多少个字节
``` bash
xxd  -s 1 -l 5 /etc/hosts
```
当将js,或其他文本类信息嵌入到C程序时, `xxd -i` 非常实用.
``` bash
$ xxd a.js
0000000: 7661 7220 6120 3d20 310a                 var a = 1.
$ xxd -i a.js
unsigned char a_js[] = {
  0x76, 0x61, 0x72, 0x20, 0x61, 0x20, 0x3d, 0x20, 0x31, 0x0a
};
unsigned int a_js_len = 10;
```

## 9. 批量修改文件名
用法:`rename 原字符串 目标字符串 文件`  
含义:  
原字符串：将文件名需要替换的字符串；  
目标字符串：将文件名中含有的原字符替换成目标字符串；  
文件：指定要改变文件名的文件列
```
rename支持通配符
?    可替代单个字符
*    可替代多个字符
[charset]    可替代charset集中的任意单个字符
```
将所有已`yum`开头的文件的后缀名从`.yumtx`改为`.txt`
``` bash
rename .yumtx .txt yum*
```

## 10. df 查询文件系统挂载点信息
`-h` 使容量的大小显示更人性化
`-T` 显示文件系统类型
``` bash
$ df -hT
Filesystem                   Type      Size  Used Avail Use% Mounted on
/dev/mapper/VolGroup-lv_root ext4       50G  8.0G   39G  18% /
devtmpfs                     devtmpfs  484M     0  484M   0% /dev
tmpfs                        tmpfs     495M     0  495M   0% /dev/shm
tmpfs                        tmpfs     495M  460K  494M   1% /run
tmpfs                        tmpfs     495M     0  495M   0% /sys/fs/cgroup
/dev/sda1                    ext4      477M  234M  215M  53% /boot
/dev/mapper/VolGroup-lv_home ext4       12G   41M   11G   1% /home
tmpfs                        tmpfs      99M     0   99M   0% /run/user/0
```
`-i` 显示inode容量
``` bash
$ df -hi
Filesystem                   Inodes IUsed IFree IUse% Mounted on
/dev/mapper/VolGroup-lv_root   3.2M  170K  3.0M    6% /
devtmpfs                       121K   389  121K    1% /dev
tmpfs                          124K     1  124K    1% /dev/shm
tmpfs                          124K   498  124K    1% /run
tmpfs                          124K    16  124K    1% /sys/fs/cgroup
/dev/sda1                      126K   358  125K    1% /boot
/dev/mapper/VolGroup-lv_home   740K    31  740K    1% /home
tmpfs                          124K     1  124K    1% /run/user/0
```

## 11. du 命令
单位是KB
如下获取/tmp下所有文件的大小, 并按降序排列
``` bash
du -xs /tmp/* | sort -rn -k1
8	systemd-private-415928f8a9ee431abb4fdb7f6265aa87-chronyd.service-uw9sq7
4	test
4	empty
4	a.tar.gz
```

## 12. find删除查找到的文件
find命令经常会用到, `-type f`表示只返回文件, `-exec` 可将已找到的结果作为标准输入执行其他命令.
``` bash
find <PATH> -type f -exec rm {} \;    # 逐个删除查找到的文件, 将 path 改为实际要查找的目录
find <PATH> -type f -exec rm {} +     # 一次性删除查找到的文件
```
``` bash
find [PATH] [option] [action]  

-mtime n : n为数字，意思为在n天之前的“一天内”被更改过的文件；  
-mtime +n : 列出在n天之前（不含n天本身）被更改过的文件名；  
-mtime -n : 列出在n天之内（含n天本身）被更改过的文件名；  
-newer file : 列出比file还要新的文件名  
例如：  
find /root -mtime 0 # 在当前目录下查找今天之内有改动的文件  
  
与文件权限及名称有关的参数：  
-name filename ：找出文件名为filename的文件  
-size [+-]SIZE ：找出比SIZE还要大（+）或小（-）的文件  
-tpye TYPE ：查找文件的类型为TYPE的文件，TYPE的值主要有：一般文件（f)、设备文件（b、c）、  
             目录（d）、连接文件（l）、socket（s）、FIFO管道文件（p）；  
-perm mode ：查找文件权限刚好等于mode的文件，mode用数字表示，如0755；  
-perm -mode ：查找文件权限必须要全部包括mode权限的文件，mode用数字表示  
-perm +mode ：查找文件权限包含任一mode的权限的文件，mode用数字表示  
例如：  
find / -name passwd # 查找文件名为passwd的文件  
find . -perm 0755 # 查找当前目录中文件权限的0755的文件  
find . -size +12k # 查找当前目录中大于12KB的文件，注意c表示byte  
```

## 13. xargs 命令
该命令可以将一个命令的输出作为参数传递给另一个命令。  
区别于管道符`|`是将将输出作为另一个命令的标准输入传递.
``` bash
find /tmp -name *.png -type f | xargs tar -cvzf images.tar.gz
```
默认是将内容放到参数的最后面, 如果要放到指定位置,需要使用 `-i` 和 `{}`  
如下所示，将第一个命令的输出放到`{}`出现的位置  
``` bash
ls /etc/*.conf | xargs -i cp {} /home/likegeeks/Desktop/out
```


## 14. grep查询文本
在文件中查找字符串(不区分大小写)
``` bash
grep -i "the" /etc/hosts
```
输出成功匹配的行，以及该行之后的三行.  -B 表示前三行. -C 指前后三行
``` bash
grep -A 3 "localhost" /etc/hosts
```
在一个文件夹中递归查询包含指定字符串的文件
``` bash
grep -r "abc" /etc
```
查找不包含 127 的所有行
``` bash
grep -v "127" /etc/hosts
```
递归搜索时忽略二进制文件,加参数`-I`
``` bash
grep -r "abc" -I /etc
```
打印被搜索的文件名
``` bash
grep -H "abc" /etc/fstab
```

## 15. tail 查看文件指定行信息

显示最后3行记录
``` bash
$ tail -3 /var/log/yum.log-20180101
Dec 10 00:35:55 Installed: libvirt-debuginfo-3.2.0-14.el7_4.3.x86_64
Dec 10 18:52:40 Installed: cloud-init-0.7.9-9.el7.centos.2.x86_64
Dec 10 19:50:30 Erased: cloud-init-0.7.9-9.el7.centos.2.x86_64
```
从第770行开始显示
``` bash
$ tail -n +770 /var/log/yum.log-20180101
Dec 10 18:52:40 Installed: cloud-init-0.7.9-9.el7.centos.2.x86_64
Dec 10 19:50:30 Erased: cloud-init-0.7.9-9.el7.centos.2.x86_64
```

## 16. 批量创建目录
``` bash
mkdir -p new_folder/{folder_1,folder_2,folder_3,folder_4,folder_5}
```

## 17. echo 相关命令
显示当前使用哪个shell
``` bash
$ echo $0
-bash
```
显示最近一个命令执行的结果码
``` bash
$ echo $?
0
```

## 18. nohup与标准输出,标准错误输出
`nohup`配和`&`可以让进程在后台运行, 如果没有显示指定, 默认将标准输出和错误输出重定向到 nohup.out  
`1>/dev/null` 首先表示标准输出重定向到空设备文件，也就是不输出任何信息到终端，不显示任何信息    
`2>&1` 表示标准错误输出重定向等同于标准输出，因为之前标准输出已经重定向到了空设备文件，所以标准错误输出也重定向到空设备文件    
常用使用方式为:  
``` bash
nohup COMMAND  >output.log 2>&1 &
```

## 19. Linux模块的安装和卸载

``` bash
lsmod                               #显示当前装入的内核模块
modinfo module_name                 #显示模块信息
modprobe -c                         #显示模块的配置信息       
modprobe --show-depends module_name #显示模块的依赖信息
modprobe module_name                #手动加载模块
rmmod module_name                   #卸载模块
```
systemd 读取 /etc/modules-load.d/ 中的配置加载额外的内核模块。配置文件名称通常为 `/etc/modules-load.d/<program>.conf`。如：
```
$ cat /etc/modules-load.d/bonding.conf
bonding
```
使用 /etc/modprobe.d/中的文件来配置传递参数，如:
``` bash
$ /etc/modprobe.d/bonding.conf
options bonding mode=1
```
别名
``` bash
$ cat /etc/modprobe.d/myalias.conf
# Lets you use 'mymod' in MODULES, instead of 'really_long_module_name'
alias mymod really_long_module_name
```
如果模块直接编译进内核，也可以通过启动管理器(GRUB, LILO 或 Syslinux)的内核行加入参数：
`modname.parametername=parametercontents`

列出直接编译到内核的模块列表  
``` bash
$ cat /lib/modules/$(uname -r)/modules.builtin
kernel/lib/zlib_deflate/zlib_deflate.ko
kernel/lib/zlib_inflate/zlib_inflate.ko
kernel/lib/crc16.ko
kernel/lib/crc32.ko
```

## 20. column格式化输出
可以让一些命令的输出看起来更舒服些. 例如`blkid`,`mount`,`cat /etc/fstab`.
``` bash
$ blkid
/dev/sda1: UUID="04f8e14d-906d-475a-bacc-7d4be966f670" TYPE="ext4"
/dev/sda2: UUID="8pXbJg-c7bG-CzS4-Xs9Y-SdBD-TYOJ-0r9hgF" TYPE="LVM2_member"
/dev/mapper/VolGroup-lv_swap: UUID="c058935d-34e0-403c-82f6-435b1c8194ce" TYPE="swap"
/dev/mapper/VolGroup-lv_root: UUID="e9fe20ee-5d6f-4610-98ca-7cbed5d012ad" TYPE="ext4"
/dev/mapper/VolGroup-lv_home: UUID="43578ba0-a809-4274-931d-b92f881196ad" TYPE="ext4"
$ blkid | column -t
/dev/sda1:                     UUID="04f8e14d-906d-475a-bacc-7d4be966f670"    TYPE="ext4"
/dev/sda2:                     UUID="8pXbJg-c7bG-CzS4-Xs9Y-SdBD-TYOJ-0r9hgF"  TYPE="LVM2_member"
/dev/mapper/VolGroup-lv_swap:  UUID="c058935d-34e0-403c-82f6-435b1c8194ce"    TYPE="swap"
/dev/mapper/VolGroup-lv_root:  UUID="e9fe20ee-5d6f-4610-98ca-7cbed5d012ad"    TYPE="ext4"
/dev/mapper/VolGroup-lv_home:  UUID="43578ba0-a809-4274-931d-b92f881196ad"    TYPE="ext4"
```
`-s `参数指定可以指定分隔符. 默认是空格
``` bash
$ grep -E "sshd|qemu" /etc/passwd | column -t -s:
sshd  x  74   74   Privilege-separated SSH  /var/empty/sshd  /sbin/nologin
qemu  x  107  107  qemu user                /                /sbin/nologin
```



## 21. 通过pid查看进程的环境变量信息
使用strings, 可以格式化打印
``` bash
$ strings /proc/1158/environ
LANG=en_US.UTF-8
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin
NOTIFY_SOCKET=/run/systemd/notify
SSH_USE_STRONG_RNG=0
```

## 22. 通过pid查看进程对应可执行文件的绝对路径
``` bash
readlink /proc/[pid]/exe
```

## 23. 通过pid查看进程的当前工作目录
``` bash
pwdx [pid]
```

## 24. lsof 一切皆文件
`-p [PID]` 只显示该进程打开的所有文件. 不带参数显示所有已打开的文件  
`-d`  对`FD`有效, 用于筛选文件列表.  `^txt` 显示除txt 其他所有类型的文件.  `1` 显示所有fd为1的文件. 可以使用`,`逗号连接多个选择  
`-a` 表示两个参数都必须满足 (AND)。如果没有 -a 标志，缺省的情况是显示匹配任何一个参数 (OR) 的文件  
`-n` 阻止网络地址转换  
`-P` 阻止端口号到端口名的转换  
`-i protocol:@ip:port` protocol 包括 tcp 和 udp. 显示符合该地址的文件列表
`-u s` s为用户名或者用户ID, 选择该用户下的文件

`lsof [name]`  
name是 mount point或者文件系统对应的设备文件, 则显示在该文件系统上打开的所有文件列表  
name是 文件夹(非mount point), 则显示所有将该文件夹作为正常文件打开的列表. 例如 cwd, rtd.  如果 `+d` 打印所有在该目录下已打开的文件,但不递归查找子目录. `+D `则允许递归查找  

谁在使用 /var/log/audit/audit.log
``` bash
$ lsof /var/log/audit/audit.log
COMMAND PID USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME
auditd  669 root    5w   REG  253,1  2027785 524474 /var/log/audit/audit.log
```

显示文件系统`/`下所有已打开的文件列表. 和`fuser /`效果一样
``` bash
$ lsof /
```

所有在/var下已打开的文件
``` bash
$ lsof +D /var/spool/
COMMAND  PID    USER   FD   TYPE DEVICE SIZE/OFF   NODE NAME
master  1297    root  cwd    DIR  253,1     4096 524402 /var/spool/postfix
master  1297    root   10uW  REG  253,1       33 524591 /var/spool/postfix/pid/master.pid
qmgr    1301 postfix  cwd    DIR  253,1     4096 524402 /var/spool/postfix
pickup  4178 postfix  cwd    DIR  253,1     4096 524402 /var/spool/postfix
```

列出tcpdump这个用户打开的所有文件
``` bash
$ lsof -u tcpdump
COMMAND   PID    USER   FD   TYPE DEVICE SIZE/OFF    NODE NAME
tcpdump 17905 tcpdump  cwd    DIR  253,1     4096 2752513 /root
tcpdump 17905 tcpdump  rtd    DIR  253,1     4096       2 /
tcpdump 17905 tcpdump  txt    REG  253,1   929928 1323976 /usr/sbin/tcpdump
tcpdump 17905 tcpdump  mem    REG  253,1    62184 1328951 /usr/lib64/libnss_files-2.17.so
tcpdump 17905 tcpdump  mem    REG    0,7           231120 socket:[231120] (stat: No such file or directory)
tcpdump 17905 tcpdump  mem    REG  253,1    90664 1311459 /usr/lib64/libz.so.1.2.7
tcpdump 17905 tcpdump  mem    REG  253,1    19776 1328757 /usr/lib64/libdl-2.17.so
tcpdump 17905 tcpdump  mem    REG  253,1  2127336 1314561 /usr/lib64/libc-2.17.so
tcpdump 17905 tcpdump  mem    REG  253,1   266496 1312167 /usr/lib64/libpcap.so.1.5.3
tcpdump 17905 tcpdump  mem    REG  253,1  2512448 1312014 /usr/lib64/libcrypto.so.1.0.2k
tcpdump 17905 tcpdump  mem    REG  253,1    23968 1311919 /usr/lib64/libcap-ng.so.0.0.0
tcpdump 17905 tcpdump  mem    REG  253,1   164264 1311451 /usr/lib64/ld-2.17.so
tcpdump 17905 tcpdump    0u   CHR  136,1      0t0       4 /dev/pts/1
tcpdump 17905 tcpdump    1u   CHR  136,1      0t0       4 /dev/pts/1
tcpdump 17905 tcpdump    2u   CHR  136,1      0t0       4 /dev/pts/1
tcpdump 17905 tcpdump    3u  pack 231120      0t0     ALL type=SOCK_RAW
tcpdump 17905 tcpdump    4w   REG  253,1   864256 2756467 /root/abc2
```

## 25. fuser 查找访问文件系统的进程
`-v` 显示具体的进程名和用户
``` bash
$ fuser -v /
                     USER        PID ACCESS COMMAND
/:                   root     kernel mount /
                     root          1 .rc.. systemd
                     root          2 .rc.. kthreadd
                     root          3 .rc.. ksoftirqd/0
                     root          5 .rc.. kworker/0:0H
```
`-k` kill掉访问该文件系统的所有进程.慎用. 先使用上述命令查询
``` bash
fuser -k /
```

## 26. dd 测试磁盘或者文件读写
高危命令, `of`一定要指向正确的文件, 不要指 `/`, `/dev/vda`, `/dev/vda1`等系统重要设备.  
该命令要在测试环境验证充分.  
`if` 表示从哪个设备/文件读  
`of` 表示写到哪个设备/文件  
`bs` 表示一次读写多少字节. 也可以使用 1K, 1M这样带单位的  
`count` 表示最多读写多少次.  总的读写量为  `bs * count`  
`/dev/zero` 可以无限读取`\0`
``` bash
dd if=/dev/zero of=/tmp/abc.txt bs=1M count=10
```

## 27. rpm 安装/更新/卸载软件包
查询系统已安装的所有软件包
``` bash
rpm -qa
```
查询某个文件所属的软件包名. 文件必须是绝对路径
``` bash
rpm -qf /etc/ssh/sshd_config
```
``` bash
rpm -qf `which strace`
```
查询包所含有的文件
``` bash
rpm -ql strace
```
查询包里的配置文件
``` bash
rpm -qc openssh-server
```
查询包里的文档
``` bash
rpm -qd openssh-server
```
查询软件包里的脚本信息
``` bash
$ rpm -q --scripts openssh-server
preinstall scriptlet (using /bin/sh):
getent group sshd >/dev/null || groupadd -g 74 -r sshd || :
getent passwd sshd >/dev/null || \
  useradd -c "Privilege-separated SSH" -u 74 -g sshd \
  -s /sbin/nologin -r -d /var/empty/sshd sshd 2> /dev/null || :
postinstall scriptlet (using /bin/sh):

if [ $1 -eq 1 ] ; then
        # Initial installation
        systemctl preset sshd.service sshd.socket >/dev/null 2>&1 || :
fi
preuninstall scriptlet (using /bin/sh):

if [ $1 -eq 0 ] ; then
        # Package removal, not upgrade
        systemctl --no-reload disable sshd.service sshd.socket > /dev/null 2>&1 || :
        systemctl stop sshd.service sshd.socket > /dev/null 2>&1 || :
fi
postuninstall scriptlet (using /bin/sh):

systemctl daemon-reload >/dev/null 2>&1 || :
if [ $1 -ge 1 ] ; then
        # Package upgrade, not uninstall
        systemctl try-restart sshd.service >/dev/null 2>&1 || :
fi
```
查询包,自定义输出的格式和地段  
``` bash
rpm -qa --queryformat "%-35{NAME} %{VERSION} %{RELEASE} %{INSTALLTIME:date}\n"
jzlib                               1.1.1 6.el7 Thu 27 Jun 2019 11:30:01 AM HKT
nss                                 3.36.0 7.1.el7_6 Tue 11 Jun 2019 11:13:42 PM HKT
hamcrest                            1.3 6.el7 Thu 27 Jun 2019 11:30:01 AM HKT
dhcp-libs                           4.2.5 68.el7.centos.1 Tue 11 Jun 2019 11:13:43 PM HKT
```
查询当前包的changelog. 常用于查看已解决的CVE列表
``` bash
rpm -q --changelog openssh-server
```
查询包所能提供的CAPABILITY
``` bash
rpm -q --provides glibc
```
查询哪些包依赖某个CAPABILITY
``` bash
rpm -q --whatrequires [CAPABILITY]
```
查询包所依赖的CAPABILITY
``` bash
rpm -q -R glibc
```
查询包所有提供的CAPABILITY
``` bash
rpm -q --whatprovides [CAPABILITY]
```
校验当前包与原始状态的差别.   
5 -- MD5 校验和  
S -- 文件长度  
L -- 符号链接   
T -- 文件修改日期  
D -- 设备  
U -- 用户  
G -- 用户组  
M -- 模式 (包含许可和文件类型)  
? -- 不可读文件  
如下标志文件的md5, 文件长度, 修改日志有变化
``` bash
$ rpm  -V openssh-server
S.5....T.  c /etc/ssh/sshd_config
```
安装本地包
`-vh` 获得一个详细的安装进程
`--nodeps` 忽略依赖关系
``` bash
rpm -ivh abc.rpm
```
卸载包
``` bash
rpm -e abc.rpm
```
升级包
``` bash
rpm -Uvh abc.rpm
```
查询本地包的信息,要加`-p`
``` bash
rpm -ql -p abc.rpm
```
## 28. yum 安装/更新/卸载软件包
``` bash
yum install a            #安装软件包a   (加上-y选项，可以在安装软件包时，不弹出是否继续的提示)
yum install xxx --downloadonly --downloaddir=/xxx  #只下载,不安装.
yum reinstall xxx        #重装
yum remove a             #卸载软件包a
yum groups list          #查看已安装的软件组和可用的软件组
yum groups  install "Basic Web Server"    #安装软件组
yum groups remove "Basic Web Server"      #卸载软件组
yum info a               #查看软件包a的相关信息，如大小，版本等...
yum update a             #更新软件包a
yum update               #整体更新所有可更新的软件包
yum provides 文件或目录    #查看文件由哪个rpm包提供的
yum search tree          #从仓库中搜索关键词为tree的包
yum history              #查看yum运行历史记录
```

> 查找某个文件属于哪个包的方法有:  
> 如果文件已经安装在本机, 则`rpm -qf xxx`  
> 如果文件没有在本机安装, 则`yum provides XXX`   XXX 可以是文件名, 也可以使用glob这样的通配符去查找  
> 比如安装某rpm包, 提示文件没找到, 则可以使用 `yum provices xxx`.  比如文件名为 abc.txt, 用`yum provides *abc.txt`去查找  


查询当前在repo里指定包的所有可用版本, 可用于升级到特定版本. `yum update systemd`默认升级到最新版
``` bash
$ yum list --showduplicates systemd
Installed Packages
systemd.x86_64                  219-42.el7_4.1                  @updates
Available Packages
systemd.x86_64                  219-42.el7                      base
systemd.x86_64                  219-42.el7_4.1                  updates
systemd.x86_64                  219-42.el7_4.4                  updates
```
升级指定包到特定的版本
``` bash
yum install systemd-219-42.el7_4.4
```
具体查看某次事务中安装,更新,删除的包列表
``` bash
$ yum history info 307
Loaded plugins: auto-update-debuginfo, fastestmirror
Transaction ID : 307
Begin time     : Sat Dec  9 20:24:11 2017
Begin rpmdb    : 700:b36eb7acc22b3ab4b107097d0b740dc6bfd84a58
End time       :            20:24:12 2017 (1 seconds)
End rpmdb      : 701:df2089f95d28d6f1f19561b39352bf3dd7a98c75
User           : root <root>
Return-Code    : Success
Command Line   : install qemu-kvm
Transaction performed with:
    Installed     rpm-4.11.3-25.el7.x86_64                      @base
    Installed     yum-3.4.3-154.el7.centos.noarch               @base
    Installed     yum-plugin-fastestmirror-1.1.31-42.el7.noarch @base
Packages Altered:
    Updated qemu-img-10:1.5.3-141.el7_4.2.x86_64        @updates
    Update           10:1.5.3-141.el7_4.4.x86_64        @updates
    Install qemu-kvm-10:1.5.3-141.el7_4.4.x86_64        @updates
    Updated qemu-kvm-common-10:1.5.3-141.el7_4.2.x86_64 @updates
    Update                  10:1.5.3-141.el7_4.4.x86_64 @updates
history info
```
查询某个软件包的所有历史变更记录
``` bash
$ yum history list  cloud-init
Loaded plugins: auto-update-debuginfo, fastestmirror
ID     | Command line             | Date and time    | Action(s)      | Altered
-------------------------------------------------------------------------------
   312 | erase cloud-init         | 2018-01-11 00:07 | Erase          |    1
   311 | install cloud-init       | 2018-01-11 00:01 | Install        |    1
   310 | erase cloud-init         | 2017-12-10 19:50 | Erase          |    1
   309 | install cloud-init       | 2017-12-10 18:52 | Install        |    1
   306 | erase cloud-init         | 2017-12-09 13:09 | Erase          |    1
   301 | install cloud-init       | 2017-10-14 11:49 | Install        |    5
history list
```

查询包的依赖关系
``` bash
$ yum deplist strace
package: strace.x86_64 4.12-4.el7
  dependency: /bin/sh
   provider: bash.x86_64 4.2.46-29.el7_4
  dependency: libc.so.6(GLIBC_2.15)(64bit)
   provider: glibc.x86_64 2.17-196.el7_4.2
  dependency: libgcc_s.so.1()(64bit)
   provider: libgcc.x86_64 4.8.5-16.el7_4.1
  dependency: libgcc_s.so.1(GCC_3.0)(64bit)
   provider: libgcc.x86_64 4.8.5-16.el7_4.1
  dependency: libgcc_s.so.1(GCC_3.3.1)(64bit)
   provider: libgcc.x86_64 4.8.5-16.el7_4.1
  dependency: rtld(GNU_HASH)
   provider: glibc.x86_64 2.17-196.el7_4.2
   provider: glibc.i686 2.17-196.el7_4.2
```

## 29. 解压缩命令
tar.gz
``` bash
tar -xzvf abc.tar.gz               #解压缩
tar -xzvf abc.tar.gz -C /path      #解压缩到制动的path目录下
tar -tzvf abc.tar.gz               #不解压,只查看文件列表
tar -czvf abc.tar.gz a.txt b.txt   #将 a.txt 和 b.txt 压缩为 abc.tar.gz
```
.gz
``` bash
gzip -d FileName.gz      #解压
gzip FileName            #压缩
```
.bz .bz2
``` bash
bzip2 -d FileName.bz2    #解压
```
.tar.bz .tar.bz2
``` bash
tar jxvf FileName.tar.bz2 #解压
```
.Z
``` bash
uncompress FileName.Z    #解压
compress FileName        #压缩
```
.zip
``` bash
unzip FileName.zip       #解压
zip FileName.zip DirName #压缩
```
.rar
``` bash
rar x FileName.rar                #解压
rar a FileName.rar DirName        #压缩
```
.rpm
``` bash
rpm2cpio FileName.rpm | cpio -div   #解包
```
.deb
``` bash
ar p FileName.deb data.tar.gz | tar -xzvf  #解包
```

## 30. systemd 管理命令
``` bash
systemctl    -t help            #列出所有的单元类型
systemctl --type "unit"         #查看指定单元类型的状况, 替换 unit 为 "mount", "service", "socket"等
systemctl --failed              #查看所有加载失败的单元信息
systemctl status sshd           #查看sshd服务单元状况
systemctl start sshd            #启动sshd服务单元
systemctl stop sshd             #停止sshd服务单元
systemctl restart sshd          #重启sshd服务单元
systemctl enable sshd           #配置sshd服务单元开机自动启动
systemctl disable sshd          #配置sshd服务单元开机不启动
systemctl reload sshd           #重新加载sshd服务单元的配置文件
systemctl mask sshd             #彻底屏蔽sshd服务单元
systemctl unmask sshd           #取消屏蔽sshd服务单元
systemctl list-units            #列出当前所有的单元, 这是 systemctl 的默认命令
systemctl get-default           #查看系统默认启动的Target
systemctl set-default multi-user.target  # 设置系统默认的target为 多用户模式
systemctl list-dependencies multi-user.target  #查看该target下所有的unit
systemctl list-dependencies sshd   # 查看一个service所依赖的所有unit
systemctl list-dependencies --reverse sshd   # 查看哪个unit依赖该服务
systemctl list-dependencies --before sshd   # 查看所有unit after sshd, 也就是 sshd 配置里的before=
systemctl list-dependencies --after sshd   # 查看所有unit before sshd
systemctl cat sshd              #查看service的配置文件
systemctl show sshd             #查看service的配置参数, 不带 service则显示默认的配置. 可用来查询nofile, noproc等限制资源参数
systemctl list-jobs             #查看有哪些job仍在运行或者等待运行
``` 
> /etc/security/limits.conf无法设置systemd服务的资源限制. 参见:   
> http://smilejay.com/2016/06/centos-7-systemd-conf-limits/  

列出当前旧的LSB脚本
``` bash
$ systemctl | grep LSB
  network.service       loaded active running   LSB: Bring up/down networking
  prl-x11.service       loaded active exited    LSB: Autostart script for Parallels service
  prltoolsd.service     loaded active running   LSB: Autostart script for guest tools service.
```
查询systemd 版本
``` bash
$ systemctl --version
systemd 219
+PAM +AUDIT +SELINUX +IMA -APPARMOR +SMACK +SYSVINIT +UTMP +LIBCRYPTSETUP +GCRYPT +GNUTLS +ACL +XZ -LZ4 -SECCOMP +BLKID +ELFUTILS +KMOD +IDN
```
查看启动耗时
``` bash
$ systemd-analyze
Startup finished in 579ms (kernel) + 2.964s (initrd) + 8.899s (userspace) = 12.442s
```
查看每个服务的启动耗时,并打印TOP5
``` bash
$ systemd-analyze blame | head -5
          4.949s NetworkManager-wait-online.service
          3.379s network.service
           987ms postfix.service
           656ms dev-mapper-VolGroup\x2dlv_root.device
           591ms lvm2-monitor.service
```
打印最耗时的一条启动链,  后面跟指定的service, 则打印该服务的启动链
``` bash
$ systemd-analyze critical-chain
The time after the unit is active or started is printed after the "@" character.
The time the unit takes to start is printed after the "+" character.

multi-user.target @8.863s
└─postfix.service @7.864s +987ms
  └─network.target @7.856s
    └─NetworkManager.service @2.459s +64ms
      └─network-pre.target @2.458s
        └─firewalld.service @1.934s +523ms
          └─polkit.service @1.724s +203ms
            └─basic.target @1.721s
              └─sockets.target @1.721s
                └─iscsiuio.socket @1.721s
                  └─sysinit.target @1.709s
                    └─systemd-update-utmp.service @1.700s +8ms
                      └─auditd.service @1.426s +272ms
                        └─systemd-tmpfiles-setup.service @1.358s +58ms
                          └─rhel-import-state.service @1.303s +52ms
                            └─local-fs.target @1.299s
                              └─home.mount @1.283s +15ms
                                └─systemd-fsck@dev-mapper-VolGroup\x2dlv_home.service @1.266s +14ms
                                  └─dev-mapper-VolGroup\x2dlv_home.device @1.265s
```
生成启动瀑布图, 使用chrome浏览器打开 a.svg. 分析启动性能更加直观
``` bash
systemd-analyze plot >a.svg
```
启动瀑布图   
![启动瀑布图](/img/systemd_plot.svg)

journalctl 相关操作
``` bash
journalctl                       # 查看所有日志（默认情况下 ，显示所有可以查看的日志）
journalctl -k                    # 查看内核日志（不显示应用日志）
journalctl -b                    # 查看系统本次启动的日志                 
journalctl -b -1                 # 查看上一次启动的日志（需更改设置）
journalctl -f               # 实时滚动显示最新日志
journalctl /usr/lib/systemd/systemd # 查看指定可执行文件的日志, 必须指定绝对路径
journalctl _PID=1                # 查看指定进程的日志
journalctl -u sshd               # 查看某个 Unit 的日志
journalctl --disk-usage          # 显示日志占据的硬盘空间
journalctl --list-boots          # 显示每次启动的id和时间
```

查看指定时间的日志
``` bash
journalctl --since "2012-10-30 18:17:16"
journalctl --since "2020-10-01"
journalctl --since "20 min ago"
journalctl --since "-5m"
journalctl --since "-5d"
journalctl --since yesterday
journalctl --since "2015-01-10" --until "2015-01-11 03:00"
journalctl --since 09:00 --until "1 hour ago"
```
时间格式可参考`man journalctl`或者`man 7 systemd.time`  

## 31. Ubuntu/Debian 检查已经安装好的软件包的更新日志
``` bash
zless /usr/share/doc/<package -name>/changelog.Debian.gz
zless /usr/share/doc/<package -name>/changelog.gz
```

## 32. 搜索含有指定字符的手册页
``` bash
$ man -k logrotate
dh_installlogrotate (1) - install logrotate config files
logrotate (8) - rotates, compresses, and mails system logs
logrotate.conf (5) - rotates, compresses, and mails system logs
```

## 33. 快速删除大量小文件
使用`rsync`, 速度快但占用大量IO, 业务量低时使用. 高危命令
``` bash
mkdir empty_dir
rsync -a --delete empty_dir/    yourdirectory/
```
使用`find`, 速度慢但消耗IO少. `rm`会遇到`Argument list too long`报错
``` bash
find /tmp -type f -exec rm {} \;      #删除/tmp目录下所有文件
```

## 34. sysctl 管理系统参数
``` bash
sysctl -a                                       #打印当前参数
sysctl -w net.ipv4.tcp_fin_timeout=30           #实时更新一个系统参数, 高危. 要验证好
sysctl -p                                       #读取/etc/sysctl.conf和 /etc/sysctl.d/下配置文件信息,使其生效  
```

## 35. 清空文件内容
假设文件名为 abc.txt, 以下方法都可以清空该文件的内容
``` bash
> abc.txt
cp /dev/null abc.txt
```

## 36. 查询系统调用
跟踪命令`ls -rlt`的系统调用, 将信息输出到`a.txt`
``` bash
strace -ftT -o a.txt ls -rlt
```
统计命令进行的系统调用信息
``` bash
strace -c ls
```
跟踪具体的进程
``` bash
strace -p [pid]
```
过滤系统调用
``` bash
strace -e trace=open ls
strace -e trace=open,write ls
```

## 37. 查看磁盘uuid和文件系统类型
```bash
$ lsblk -f
NAME   FSTYPE LABEL UUID                                 MOUNTPOINT
vda
└─vda1 ext3         32236b41-fcde-460e-8c34-ba50515b33f2 /
$ blkid
/dev/vda1: UUID="32236b41-fcde-460e-8c34-ba50515b33f2" TYPE="ext3"
```

## 38. 创建软连接
``` bash
ln -s regular_file softlink          创建软连接
```

## 39. history查看历史记录
如果直接执行`history`没有显示时间戳,可以使用下面的命令
``` bash
HISTTIMEFORMAT="%d/%m/%y %T"
history
```

## 40. 查看进程的父子调用关系
`-a` 显示命令行参数  
`-p` 显示pid信息. {}表示线程  
`-s` 显示特定进程的所有父进程，不加该参数显示特定进程的所有子进程  
``` bash
$ pstree -p
systemd(1)─┬─agetty(1176)
           ├─auditd(669)───{auditd}(670)
           ├─avahi-daemon(701)───avahi-daemon(720)
           ├─chronyd(721)
           ├─crond(1169)
           ├─dbus-daemon(702)───{dbus-daemon}(730)
           ├─dhclient(4673)
           ├─dnsmasq(1344)───dnsmasq(1345)
           ├─firewalld(776)───{firewalld}(952)
           ├─gssproxy(714)─┬─{gssproxy}(724)
           │               ├─{gssproxy}(725)
           │               ├─{gssproxy}(726)
           │               ├─{gssproxy}(727)
           │               └─{gssproxy}(728)
```

``` bash
# pstree -ap 3598
bash,3598
  └─pstree,3941 -ap 3598
# pstree -aps 3598
systemd,1 --switched-root --system --deserialize 30
  └─sshd,869
      └─sshd,3595
          └─sshd,3597
              └─bash,3598
                  └─pstree,3942 -aps 3598
```

## 41. rsync文件
rsync [OPTION]... SRC [SRC]... DEST  
在指定复制源时，路径是否有最后的 “/” 有不同的含义，例如：  
/data ：表示将整个 /data 目录复制到目标目录  
/data/ ：表示将 /data/ 目录中的所有内容复制到目标目录  
`--stats` : 输出文件传输的状态   
`--progress` : 输出文件传输的进度  
`-a`归档模式, 递归且保留符号链接，保留权限信息，时间戳，以及owner,group信息   
`-z`  打开压缩功能  
`-v` verbose更多打印信息  
本地同步
``` bash
rsync -azv /var/opt/installation/inventory/ /root/temp/
```
从本地到远端
``` bash
rsync -avz /root/temp/ thegeekstuff@192.168.200.10:/home/thegeekstuff/temp/
``` 

## 42. 查询的动态库链接信息
查询python这个程序依赖的所有动态库
``` bash
$ ldd `which python`
	linux-vdso.so.1 =>  (0x00007fffb1fb4000)
	libpython2.7.so.1.0 => /lib64/libpython2.7.so.1.0 (0x00007f5dee201000)
	libpthread.so.0 => /lib64/libpthread.so.0 (0x00007f5dedfe5000)
	libdl.so.2 => /lib64/libdl.so.2 (0x00007f5dedde0000)
	libutil.so.1 => /lib64/libutil.so.1 (0x00007f5dedbdd000)
	libm.so.6 => /lib64/libm.so.6 (0x00007f5ded8db000)
	libc.so.6 => /lib64/libc.so.6 (0x00007f5ded517000)
	/lib64/ld-linux-x86-64.so.2 (0x0000561b940b0000)
[root@linux /tmp/new_folder]#
``` 

## 43. 查询ascii编码表
速查编码信息
``` bash
man ascii
```

## 44. iptable 内置防火墙

iptables内置了4个表，即raw表、filter表、nat表和mangle表，默认操作filter表.

规则表之间的优先顺序如下：
```
     Raw      -->    mangle       ->        nat    -->      filter
prerouting          prerouting          prerouting        input
output              postrouting         postrouting       output
                    input               output            forward
                    output
                    forward
```
查询表中的规则,当时打印匹配该规则的包和字节数  
``` bash
iptables -nvL
```

`REJECT`   拦阻该数据包，并返回数据包通知对方，可以返回的数据包有几个选择：ICMP port-unreachable、ICMP echo-reply 或是tcp-reset（这个数据包包会要求对方关闭联机），进行完此处理动作后，将不再比对其它规则，直接中断过滤程序。 范例如下：
``` bash
iptables -A  INPUT -p TCP --dport 22 -j REJECT --reject-with ICMP echo-reply
```
`DROP`  丢弃数据包不予处理，进行完此处理动作后，将不再比对其它规则，直接中断过滤程序。
`REDIRECT`   将封包重新导向到另一个端口（PNAT），进行完此处理动作后，将会继续比对其它规则。这个功能可以用来实作透明代理 或用来保护web 服务器。例如：
``` bash
iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT--to-ports 8081
```
`MASQUERADE` 改写封包来源IP为防火墙的IP，可以指定port 对应的范围，进行完此处理动作后，直接跳往下一个规则链（mangle:postrouting）。这个功能与SNAT略有不同，当进行IP 伪装时，不需指定要伪装成哪个 IP，IP 会从网卡直接读取，当使用拨接连线时，IP 通常是由ISP公司的DHCP服务器指派的，这个时候MASQUERADE特别有用。范例如下：
``` bash
iptables -t nat -A POSTROUTING -p TCP -j MASQUERADE --to-ports 21000-31000
```
`LOG`   将数据包相关信息纪录在 /var/log 中，详细位置请查阅 /etc/syslog.conf 配置文件，进行完此处理动作后，将会继续比对其它规则。例如：
``` bash
iptables -A INPUT -p tcp -j LOG --log-prefix "input packet"
```
`SNAT` 改写封包来源IP为某特定IP或IP范围，可以指定port对应的范围，进行完此处理动作后，将直接跳往下一个规则炼（mangle:postrouting）.范例如下：
``` bash
iptables -t nat -A POSTROUTING -p tcp -o eth0 -j SNAT --to-source 192.168.10.15-192.168.10.160:2100-3200
```
`DNAT` 改写数据包包目的地 IP 为某特定 IP 或 IP 范围，可以指定 port 对应的范围，进行完此处理动作后，将会直接跳往下一个规则链（filter:input 或 filter:forward）。范例如下：
``` bash
iptables -t nat -A PREROUTING -p tcp -d 15.45.23.67 --dport 80 -j DNAT --to-destination 192.168.10.1-192.168.10.10:80-100
```
`MIRROR`  镜像数据包，也就是将来源 IP与目的地IP对调后，将数据包返回，进行完此处理动作后，将会中断过滤程序。
`QUEUE`   中断过滤程序，将封包放入队列，交给其它程序处理。透过自行开发的处理程序，可以进行其它应用，例如：计算联机费用.......等。
`RETURN`  结束在目前规则链中的过滤程序，返回主规则链继续过滤，如果把自订规则炼看成是一个子程序，那么这个动作，就相当于提早结束子程序并返回到主程序中。
`MARK` 将封包标上某个代号，以便提供作为后续过滤的条件判断依据，进行完此处理动作后，将会继续比对其它规则。范例如下：
``` bash
iptables -t mangle -A PREROUTING -p tcp --dport 22 -j MARK --set-mark 22
```

清空iptables规则
``` bash
# set ACCEPT for default action
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT
# flush all chains
iptables -F
# delete all  user-defined chains
iptables -X
```
丢弃TCP访问21端口的包  
``` bash
iptables -A INPUT -p tcp --dport 21 -j DROP
```
加`--line-numbers`参数可以打印规则序号. 删除时用
``` bash
iptables -nvL --line-numbers
```
删除INPUT链里的第三个规则
``` bash
iptables -D INPUT 3
```

https://blog.csdn.net/htmlxx/article/details/51412750    
这里记录了一些常用的iptables规则操作  

## 45. tcpdump 抓包
常用表达式:  
非 : ! or "not" (去掉双引号)    
且 : && or "and"     
或 : || or "or"  
`-nn`  不转换地址和端口号
`-v`   打印详情
``` bash
tcpdump -i eth0 -nnv
```
抓取所有经过eth1，地址是192.168.1.1且端口号为25的所有包
``` bash
tcpdump -i eth1 host 192.168.1.1 and port 25
```
-c count  抓取指定数目的包后退出
``` bash
tcpdump -i eth0 -c 1000
```
-C file_size 循环抓包,当文件达到指定的大小后,将包写入到新文件.举例如下:
``` bash
tcpdump -i eth0 -C 1 -w abc
$ ls -rlt abc*
-rw-r--r--. 1 tcpdump tcpdump 1001078 Jan 14 23:33 abc
-rw-r--r--. 1 tcpdump tcpdump  647168 Jan 14 23:33 abc1
```
抓取本机eth0网卡发往公网ip的数据包
``` bash
tcpdump -n -i eth0 'not net 10.0.0.0/8 and not net 192.168.0.0/16 and not net 172.16.0.0/12'
```
## 46. DNS查询工具

指定DNS服务器递归查
``` bash
$ dig www.baidu.com @8.8.8.8

; <<>> DiG 9.9.4-RedHat-9.9.4-51.el7 <<>> www.baidu.com @8.8.8.8
;; global options: +cmd
;; Got answer:
;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 4712
;; flags: qr rd ra; QUERY: 1, ANSWER: 3, AUTHORITY: 0, ADDITIONAL: 1

;; OPT PSEUDOSECTION:
; EDNS: version: 0, flags:; udp: 512
;; QUESTION SECTION:
;www.baidu.com.			IN	A

;; ANSWER SECTION:
www.baidu.com.		1043	IN	CNAME	www.a.shifen.com.
www.a.shifen.com.	218	IN	A	220.181.112.244
www.a.shifen.com.	218	IN	A	220.181.111.188

;; Query time: 78 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)
;; WHEN: Mon Jan 15 00:03:09 HKT 2018
;; MSG SIZE  rcvd: 101
```

反解析
``` bash
$ dig -x 74.125.135.105
;; QUESTION SECTION:
;105.135.125.74.in-addr.arpa.   IN      PTR

;; ANSWER SECTION:
105.135.125.74.in-addr.arpa. 83205 IN   PTR     ni-in-f105.1e100.net.
```

全过程迭代跟踪
``` bash
dig +trace www.baidu.com
```

## 47. NTP时间同步

ntpdate 手工校准时间, 加 `-q` 只查询, 不同步时间,  加 `-d` 打开Debug模式, 但不真正更新时间 
``` bash
$ ntpdate ntp1.aliyun.com
15 Jan 23:18:51 ntpdate[18981]: adjust time server 182.92.12.11 offset 0.000643 sec
```
安装`ntpd`时查询ntp同步状态的命令为`ntpq -p`  
如果使用`chronyd`(centos7默认)是命令为`chronyc sources -v`
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
^* time5.aliyun.com              2   6    37    41  +2394ns[+1057us] +/-   15ms
^- 120.25.115.19                 2   6    37    40  -2559us[-2559us] +/-   67ms
```

## 48. netstat查询网络连接信息
查看所有tcp下监听端口, p表示打印相应的进程
``` bash
netstat -lntp
```
查看所有已经建立的连接
``` bash
netstat -antp
```
查看路由表
``` bash
netstat -rn
```
查看网络统计信息进程
``` bash
netstat -s
```

## 49. ethtool 网卡查询工具

`-i` 查网卡驱动信息
``` bash
$ ethtool -i  eth0
driver: virtio_net
version: 1.0.0
firmware-version:
expansion-rom-version:
bus-info: 0000:00:05.0
supports-statistics: no
supports-test: no
supports-eeprom-access: no
supports-register-dump: no
supports-priv-flags: no
```
不跟参数,显示速率,全双工模式等信息(虚拟机下没有)  
Link 为`yes`表示 网线连接正常
``` bash
$ ethtool eth0
Settings for eth0:
	Link detected: yes
```

## 50. ip 网络维护
启用接口
```
ip link set <接口名> up
```
禁用接口
```
ip link set <接口名> down
```
设置接口MAC地址（设置前请先禁用接口）
```
ip link set <接口名> address <值>
```
设置接口MTU（设置前请先禁用接口）
例：把ens33的MTU改成9000并检查。
```
# ip link show dev ens33 #修改前

2: ens33: <BROADCAST,MULTICAST> mtu 1500 qdisc pfifo_fast state DOWN mode DEFAULT qlen 1000
    link/ether 88:32:9b:ca:3f:49 brd ff:ff:ff:ff:ff:ff
# ip link set ens33 mtu 9000

# ip link show dev ens33  #修改后

2: ens33: <BROADCAST,MULTICAST> mtu 9000 qdisc pfifo_fast state DOWN mode DEFAULT qlen 1000
    link/ether 88:32:9b:ca:3f:49 brd ff:ff:ff:ff:ff:ff
```
查看网卡的详细信息, 比如是bridge还是veth等类型
``` bash
ip --details link
ip link  show type bridge  #显示所有的桥接设备
```
下面脚本可以显示每个链路的类型, 除了以太网  
``` bash
!/bin/bash

# Arguments: $1: Interface ('grep'-regexp).

# Static list of types (from `ip link help`):
TYPES=(bond bond_slave bridge dummy gre gretap ifb ip6gre ip6gretap ip6tnl ipip ipoib ipvlan macvlan macvtap nlmon sit vcan veth vlan vti vxlan tun tap)

iface="$1"

for type in "${TYPES[@]}"; do
  ip link show type "${type}" | grep -E '^[0-9]+:' | cut -d ':' -f 2 | sed 's|^[[:space:]]*||' | while read _if; do
    echo "${_if}:${type}"
  done | grep "^${iface}"
done
```
查看网卡状态和对应的IP信息
``` bash
ip addr
```
给接口eth0赋予地址10.211.55.10 掩码是255.255.255.0(24代表掩码中1的个数)，广播地址是10.211.55.255
``` bash
ip addr add 10.211.55.10/24 dev eth0
```
删除eth0上的 10.211.55.10 
``` bash
ip addr del 10.211.55.10/24 dev eth0
```
查看路由表信息
``` bash
$ ip route
default via 10.211.55.1 dev eth0
10.211.55.0/24 dev eth0 proto kernel scope link src 10.211.55.9
192.168.122.0/24 dev virbr0 proto kernel scope link src 192.168.122.1
```
查询目的地为`192.168.1.1`时选择的路由情况
``` bash
$ ip route get 192.168.1.1
192.168.1.1 via 10.211.55.1 dev eth0 src 10.211.55.9
    cache
```
增加默认路由
``` bash
ip route add default via 20.0.0.1
```
策略性路由相对于传统的路由算法主要是引入了多路由表以及规则的概念。  
例如一个子网通过一个路由器与外界相连，路由器与外界有两条线路相连，其中一条的速度比较快，一条的速度比较慢。对于子网内的大多数用户来说对速度并没有特殊的要求，所以可以让他们用比较慢的路由；但是子网内有一些特殊的用户却是对速度的要求比较苛刻，所以他们需要使用速度比较快的路由。如果使用一张路由表上述要求是无法实现的，而如果根据源地址或其它参数，对不同的用户使用不同的路由表，这样就可以大大提高路由器的性能。  
优先级别越高的规则越先匹配（数值越小优先级别越高）。

系统内置3张表:
```
表255 本地路由表（Local table）本地接口地址，广播地址，已及NAT地址都放在这个表。该路由表由系统自动维护，管理员不能直接修改。
表254 主路由表（Main table）如果没有指明路由所属的表，所有的路由都默认都放在这个表里，route）所添加的路由都会加到这个表。
表253 默认路由表（Default table）一般来说默认的路由都放在这张表，但是如果特别指明放的也可以是所有的网关路由。
```
查看路由规则, `32766`表示优先级, 越小优先级越高. 
``` bash
$ ip rule list
0:	from all lookup local
32766:	from all lookup main
32767:	from all lookup default
```
创建一个新的路由表, 原地址为`192.168.2.0/24`的消息全部路由到这张表里
``` bash
$ echo "250 test" >> /etc/iproute2/rt_tables
$ ip rule add from 192.168.2.0/24 table test
```
上面的配置如果要持久化, 可以将命令写入`/etc/rc.d/rc.local`, 并给该文件可执行权限. `chmod +x /etc/rc.d/rc.local`  


查看某一张表里的路由信息  
``` bash
$ ip route list table main
```
规则匹配的对象是所有的数据包，动作是选用路由表1的路由，这条规则的优先级是32800
``` bash
$ ip rule add from 0/0 table 1 pref 32800
```
规则匹配的对象是IP为192.168.3.112，tos等于0x10的包，使用路由表2，这条规则的优先级是1500
``` bash
ip rule add from 192.168.3.112/32 [tos 0x10] table ２ pref 1500
```
在table test里添加一条默认路由
``` bash
ip route add default via 182.169.1.1 table test
```
上面的规则是以源地址为关键字，作为是否匹配的依据的。除了源地址外，还可以用以下的信息：
```
from -- 源地址
to -- 目的地址（这里是选择规则时使用，查找路由表时也使用）
tos -- IP包头的TOS（type of sevice）域
dev -- 物理接口
fwmark -- 防火墙参数
```
采取的动作除了指定表，还可以指定下面的动作：
```
Table 指明所使用的表
Nat 透明网关
Action prohibit 丢弃该包，并发送 COMM.ADM.PROHIITED的ICMP信息
Reject 单纯丢弃该包
Unreachable丢弃该包，并发送 NET UNREACHABLE的ICMP信息
```

实际场景中尽量使用`ip rule to xxxx table xxx`针对目的IP指定路由表. 这样无论是收到请求后回复,或者主动发起请求都能匹配  

具体的语法可参考`man ip-rule`和`man ip-route`  
https://www.redhat.com/sysadmin/beginners-guide-network-troubleshooting-linux  
http://www.microhowto.info/troubleshooting/troubleshooting_the_routing_table.html


ip netns操作  
https://www.cnblogs.com/sparkdev/p/9253409.html  


## 51. who 查看当前登录用户
``` bash
$ who
root     pts/0        2018-01-17 22:28 (10.211.55.2)
```

## 52. 使用iftop查看主机实时网络流量
类似top这样的交互式界面  
监控网卡的实时流量,反向解析IP,同时还显示具体每个连接接受和发送的流量  
注意显示流量的单位为b.  例如 `8Mb = 1MB`.  所有流量值都是 per second  
按`n`关闭主机名解析, 按`N`关闭端口号解析, 按`p`显示连接的端口号  
`iftop -f "port 22"`过滤只显示端口为22的连接的流量信息, 过滤语法跟`tcpdump`一样    
直接运行`iftop`, 得到如下信息:  

> 第一行类似刻度尺的刻度，为显示流量图形的长条作标尺用的。   
> <= =>这两个左右箭头，表示的是流量的方向。   
> TX：发送流量  
> RX：接收流量  
> TOTAL：总流量  
> Cumm：运行iftop到目前时间的总流量  
> peak：流量峰值  
> rates：分别表示过去 2s 10s 40s 的平均流量  

![iftop交互图](/img/iftop.png)

## 53. Bash相关环境变量

历史信息显示时间格式  
如下设置后, 使用`history`就会显示具体命令的具体执行时间.    
可以直接将其写在 .bashrc文件里
``` bash
HISTTIMEFORMAT="%d/%m/%y %T "
```

PS1变量 
设置登录提示符, 如下带颜色显示当前用户, 主机名和当前目录的绝对路径.  
``` bash
PS1="[\e[1;31m\u@\h \e[0;34m${PWD}\e[0m]\\$ "
```

## 54. 查本机的公网IP
通常我们的主机都在内网,  访问互联网是都是换成公网IP后去连接的  
如下是查询我们主机的公网IP  
1. 打开百度 www.baidu.com  
2. 输出两个字符 `ip`, 敲回车  
3. 新页面显示的本机IP就是公网IP  

## 55. 查询linux系统的一些限制信息
如下文章详细列举了redhat/centos各版本操作系统的重要限制信息.  
比如ext4限制, 最大cpu, 最大Memory  
https://access.redhat.com/articles/rhel-limits

## 56. 判断虚拟化类型的N种方法
``` bash
$ dmidecode -s system-manufacturer
OpenStack Foundation
```
``` bash
$ systemd-detect-virt
kvm
```
``` bash
$ virt-what
kvm
```

## 57. cpu信息解读
``` bash
$ lscpu
Architecture:          x86_64              // 架构 
CPU op-mode(s):        32-bit, 64-bit      // 位数
Byte Order:            Little Endian       // 小端
CPU(s):                2                   // 逻辑cpu数
On-line CPU(s) list:   0,1
Thread(s) per core:    1                   // 一个核有一个线程. 
Core(s) per socket:    2                   // 一个插槽有两个核
Socket(s):             1                   // 总共一个插槽
NUMA node(s):          1
Vendor ID:             GenuineIntel
CPU family:            6
Model:                 69
Model name:            Intel(R) Core(TM) i5-4260U CPU @ 1.40GHz
Stepping:              1
CPU MHz:               2000.000
BogoMIPS:              4000.00
Hypervisor vendor:     KVM                 // 虚拟化类型
Virtualization type:   full                // 全虚拟化
L1d cache:             32K
L1i cache:             32K
L2 cache:              256K
L3 cache:              3072K
NUMA node0 CPU(s):     0,1
............
```


## 58. taskset指定进程的CPU亲和性
返回的mask为十六进制, 3 代表 0x11 即绑定在cpu 0 和 1 上面. 最低位代表第一个cpu  
taskset -p pid 返回pid对应进程当前的亲和性  
``` bash
$ taskset -p 691
pid 691's current affinity mask: 3
```

`taskset -p mask pid`设置进程的cpu亲和性  
也可以使用数字代替mask, 比如 `taskset -c 0,1 -p 1` 表示为pid为1的进程绑定cpu0和1  

`taskset 1 ls` 执行ls命令是直接绑定到cpu0上. 

`/proc/[pid]/status`也可以查询, 举例:  

> Cpus_allowed:   3  
> Cpus_allowed_list:      0-1  
> 解释:   
> Cpus_allowed:3指出该进程可以使用CPU的亲和性掩码,因为我们指定为两块CPU,所以这里就是3,如果该进程指定为4个CPU(如果有话),这里就是F(1111).  
> Cpus_allowed_list:0-1指出该进程可以使用CPU的列表,这里是0-1.  

进程运行时设置的亲和性并不影响其他线程, 如果要对java这样的多线程设置, 需要ps -efL 找到所有线程, 然后逐一设置  
`taskset 1 java`启动java命令时的绑定, 会应用到所有线程, 因为cpu的亲和性具有继承性  

## 59. Linux系统最大文件数量

`ulimit -n`返回当前user单进程可打开的最大进程数  
`/proc/[pid]/limits` 查询该进程的资源限制数据  
`ls -rlt /proc/[pid]/fd | wc -l` 查询该进程当前已打开的文件数  
`lsof -p [pid] | wc -l ` 也可查询, 但要过滤掉cwd, 动态库等  
`ulimit -n unlimited`是无效的, 进程级的文件句柄不支持`unlimited`, 最大值为 `/proc/sys/fs/nr_open`, 该值默认为1048576.
``` bash
# ulimit -n 1048577
-bash: ulimit: op]en files: cannot modify limit: Operation not permitted
# ulimit -n unlimited
-bash: ulimit: open files: cannot modify limit: Operation not permitted
# cat /proc/sys/fs/nr_open
1048576
```
在centos7上`nr_open`的最大值可调整为2147483584
``` bash
# sysctl -w fs.nr_open=2147483585
sysctl: setting key "fs.nr_open": Invalid argument
fs.nr_open = 2147483585
# sysctl -w fs.nr_open=2147483584
fs.nr_open = 2147483584
```

查询整个OS当前的文件数使用情况:  
file-max显示所有进程的最大文件数, 可通过`echo 100000 > /proc/sys/fs/file-max`提高
``` bash
$ cat /proc/sys/fs/file-max
97703
```
file-nr是只读的, 第一个字段代表已分配(即已打开)文件数, 第二个字段从2.6开始一直为0, 第三个字段等于file-max
``` bash
$ cat /proc/sys/fs/file-nr
1344	0	97703
```
列出每个进程的已打开的文件数, 用于找到当前哪个进程占用最多文件数  
`-d` 用于排除cwd, 动态库之类的信息   
`-n` 不用协议解析, 加快命令运行速度  
`lsof -n -d0-999999 | awk '{print $2}' | sort | uniq -c | sort -k1 -n`    


## 60. ss 查询socket连接信息

类似于`netstat`, 使用了netlink, 性能更好
``` bash
ss -s                #显示各socket的统计信息
ss -ntlp             #-n 不解析, -t 显示tcp连接  -l 显示监听socket, -p 显示使用的进程名
ss -t -a             #查看所有tcp连接, 不带-a则指显示 Established 连接
ss -to               #查看tcp的keepalive信息
ss -ti               #查看tcp的内部信息,比如拥塞算法,rto,rtt,cwnd,ssthresh等
ss -tm               #查看tcp的内存使用信息, 比如收发缓冲区的大小
```
还有一些高级的过滤用法
``` bash
ss  -A raw,packet_raw  -a -p                             #查看raw socket的信息
ss -tn  state listening                                  #显示处于listening状态的连接
ss -tn  state established                                #显示处于established状态的连接
ss -tn  state listening  '( sport == 22 )'               #显示处于listening状态且源端口为22的连接
ss -tn '( sport == 22 )'                                 #显示源端口为22的连接
ss -tn '( sport != 22 )'                                 #显示源端口不为22的连接
ss -tn '( sport == 22 || dport == 22 )'                  #显示源端口为22或者目标端口为22的连接
ss -tn '( dst 10.211.55.2 && dport == 58181 )'           #显示目标ip为10.211.55.2且目标端口为58181的连接
ss -tn '( src 127.0.0.1 )'                               #显示源ip为 127.0.0.1的连接
ss -tn '( ! dst 10.211.55.2 && dport != 58181 )'         #显示目标ip不是10.211.55.2且目标端口不是58181的连接
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

更多使用介绍请参考:   
https://www.cyberciti.biz/tips/linux-investigate-sockets-network-connections.html  
https://man7.org/linux/man-pages/man8/ss.8.html  
https://github.com/shemminger/iproute2/blob/main/misc/ssfilter.y  

## 61. 消除用户被锁的错误登录记录

通常管理员会配置pam_faillock或者pam_tally2, 当用户使用错误密码满足一定条件, 就将用户锁定一段时间. 如下是即时清除错误记录的命令  
``` bash
faillock --reset
pam_tally2 -r -u [username]
```

## 62. 估计RSS总和的大小

``` bash
ps aux | awk '{sum+=$6} END {print sum / 1024}'
```
如下脚本也可以:   
``` bash
$ cat rss.sh
#/bin/bash
for PROC in `ls  /proc/|grep "^[0-9]"`
do
  if [ -f /proc/$PROC/statm ]; then
      TEP=`cat /proc/$PROC/statm | awk '{print ($2)}'`
      RSS=`expr $RSS + $TEP`
  fi
done
RSS=`expr $RSS \* 4`
echo $RSS"KB"
```

## 63. 文件系统修复

针对xfs, 使用`xfs_repair`命令:  
`-n` 表示不修复, 只扫描并显示错误  
``` bash
xfs_repair -n -v /dev/mapper/vg-home
```
不带`-n`, 执行修复. `-v`表示显示详情  
``` bash
xfs_repair -v /dev/mapper/vg-home
```

最后方法：损失部分数据的修复方法  
根据打印消息，修复失败时：  
先执行xfs_repair -L /dev/sdd(清空日志，会丢失文件)，再执行xfs_repair /dev/sdd，再执行xfs_check /dev/sdd 检查文件系统是否修复成功。 

> -L是修复xfs文件系统的最后手段，慎重选择，它会清空日志，会丢失用户数据和文件。 

## 64. 非交互式修改密码

``` bash
echo "Linux@123" |passwd --stdin root
```

## 66. udev管理

查询设备的信息, 主要是环境变量  
``` bash
udevadm info /dev/sda1
P: /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sda/sda1
N: sda1
S: disk/by-id/ata-CentOS_Linux-0_SSD_FFACPKN8NC9MK3EX3N4R-part1
S: disk/by-uuid/5de1c8df-9b03-4830-9b56-b96a2290b78f
E: DEVLINKS=/dev/disk/by-id/ata-CentOS_Linux-0_SSD_FFACPKN8NC9MK3EX3N4R-part1 /dev/disk/by-uuid/5de1c8df-9b03-4830-9b56-b96a2290b78f
E: DEVNAME=/dev/sda1
E: DEVPATH=/devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sda/sda1
E: DEVTYPE=partition
E: ID_ATA=1
E: ID_ATA_ROTATION_RATE_RPM=0
E: ID_ATA_SATA=1
E: ID_ATA_SATA_SIGNAL_RATE_GEN1=1
```

加参数`-a`, 主要是设备的属性.  
``` bash
udevadm info -a /dev/sda1
P: /devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sda/sda1
N: sda1
S: disk/by-id/ata-CentOS_Linux-0_SSD_FFACPKN8NC9MK3EX3N4R-part1
S: disk/by-uuid/5de1c8df-9b03-4830-9b56-b96a2290b78f
E: DEVLINKS=/dev/disk/by-id/ata-CentOS_Linux-0_SSD_FFACPKN8NC9MK3EX3N4R-part1 /dev/disk/by-uuid/5de1c8df-9b03-4830-9b56-b96a2290b78f
E: DEVNAME=/dev/sda1
E: DEVPATH=/devices/pci0000:00/0000:00:1f.2/ata1/host0/target0:0:0/0:0:0:0/block/sda/sda1
E: DEVTYPE=partition
E: ID_ATA=1
E: ID_ATA_ROTATION_RATE_RPM=0
E: ID_ATA_SATA=1
E: ID_ATA_SATA_SIGNAL_RATE_GEN1=1
```
`udevadmin monitor`用于实时监控udev实践,定位热插拔设备时特别有用.  
`udevadmin test xxxx`用于测试匹配设备的规则执行动作.   
xxx可以是`/sys/class/block/sda`,`/sys/class/net/eth0`, 也可以是`/sys/devices`下面的设备  

修改`/etc/udev/udev.conf`里的`udev_log="debug"`可以打开更详细的日志  
使用`journalctl -u systemd-udevd`查看  

## 67. 一条命令启动web服务器

查询设备的信息, 主要是环境变量  
``` bash
python -m SimpleHTTPServer 8000
```


## 68. dpkg,apt-get包管理命令

查询所有包
``` bash
dpkg -l
```
查询某个文件属于哪个包
``` bash
$ dpkg -S /usr/bin/growpart
cloud-guest-utils: /usr/bin/growpart
```
查询使用apt-get安装的历史记录
``` bash
$ cat /var/log/apt/history.log
```
## 69. 主机安全入侵盘查

检查`LD_PRELOAD`环境变量  
使用`vi`打开`/etc/ld.so.preload`这个文件是否有内容  
使用`cat /proc/$$/mountinfo` 或者`cat /proc/mounts ` 看`proc` 是否被挂载到其他目录  
使用`strace`检查普通命令的系统调用  
如下个三个安全相关的分析案例:   
https://www.anquanke.com/post/id/160843  
https://superuser.com/questions/1183037/what-is-does-ld-so-preload-do  
https://www.jianshu.com/p/31e487daa79d  

## 70. top命令

top默认3秒刷新一次信息, 导致一些即时启动并结束的进程无法观察到, 可以用如下参数指定间隔:  
``` bash
top -d 0.1
```
上面是以100ms为间隔, 也可进入交互模式后按`d`进行动态调整  
交互模式下按`1`显示每个cpu的使用率信息, 按`M` 进程按内存排序, 按`H`显示线程信息  

top进程级的默认字段如果不够, 可以按`f`选择要显示的字段,比如`last cpu used`, 然后按`q`返回显示  
`f`后不仅可以增加,删除,调整字段顺序, 还可以按`s`将当前选中的字段作为排序的字段.  比如按内存排序  
如果要过滤进程, 比如只显示cmdline 包含字符abc的进程, 按`o`后输入`COMMAND=abc`, 碰到java这种进程, 可以按`c`显示完整的命令行  

查看单个进程的所有线程信息, 对java程序特别有用
``` bash
$ top -Hp 4592
Threads:  11 total,   0 running,  11 sleeping,   0 stopped,   0 zombie
%Cpu(s):  0.0 us,  0.0 sy,  0.0 ni, 98.4 id,  0.0 wa,  1.6 hi,  0.0 si,  0.0 st
MiB Mem :   7809.8 total,   5711.5 free,    910.8 used,   1187.6 buff/cache
MiB Swap:      0.0 total,      0.0 free,      0.0 used.   6748.4 avail Mem

    PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
   4592 root      20   0 1810424 372332  14820 S   0.0   4.7   0:06.87 gopls
   4593 root      20   0 1810424 372332  14820 S   0.0   4.7   0:06.01 gopls
   4594 root      20   0 1810424 372332  14820 S   0.0   4.7   0:00.68 gopls
   4595 root      20   0 1810424 372332  14820 S   0.0   4.7   0:07.53 gopls
   4596 root      20   0 1810424 372332  14820 S   0.0   4.7   0:00.58 gopls
   4597 root      20   0 1810424 372332  14820 S   0.0   4.7   0:00.00 gopls
   4598 root      20   0 1810424 372332  14820 S   0.0   4.7   0:06.96 gopls
   4605 root      20   0 1810424 372332  14820 S   0.0   4.7   0:06.64 gopls
   4644 root      20   0 1810424 372332  14820 S   0.0   4.7   0:06.70 gopls
   4647 root      20   0 1810424 372332  14820 S   0.0   4.7   0:00.01 gopls
   4818 root      20   0 1810424 372332  14820 S   0.0   4.7   0:00.27 gopls
```

## 71. ping命令

`-i`指定两次ping之前的间隔, 默认是1s
``` bash
ping -i 0.1 www.163.com
```
`-s`指定ping包的大小, 默认是64bytes
``` bash
$ ping -s 1024 www.163.com
PING z163ipv6.v.bsgslb.cn (117.23.1.15) 1024(1052) bytes of data.
1032 bytes from 117.23.1.15: icmp_seq=1 ttl=128 time=7.03 ms
1032 bytes from 117.23.1.15: icmp_seq=2 ttl=128 time=7.77 ms
```

## 72. ping和curl常见的网络报错

ping ip 报错：  
`connect: Network is unreachable` 原因是OS里没有相关路由导致  
`From 192.168.100.1 icmp_seq=1 Destination Port Unreachable` 原因是收到icmp reponse, 端口不可达， 中间设备或者iptable reject  

cur ip 一些报错:   
`curl: (7) Failed to connect to 114.114.114.114: Network is unreachable` 原因是OS里没有相关路由导致
很快返回`curl: (7) Failed connect to 114.114.114.114:80; Connection refused` 因为Curl收到icmp 应答消息 80端口不可达， 可能是中间设备iptable发送或者收到服务端rst消息， 80端口没有处于监听状态   

## 73. 一些常用的内存统计命令
统计所有进程占用的物理内存
``` bash
# 使用 grep 查找 Pss 指标后，再用 awk 计算累加值
$ grep Pss /proc/[1-9]*/smaps | awk '{total+=$2}; END {printf "%d kB\n", total }'
391266 kB
```
有时smaps文件会看到没有读写权限的内存段,但有p这个权限,即是内存,往往发生在libc这样的共享库和java程序.  
如下文章解释了具体的目的, java程序的情况下经常占用了很大的内存, 只要是为了预留一段连续的内存快    
这些内存是不会计算到`Rss`或者`Pss`里面, 但却实实在在占用了内存.  
https://unix.stackexchange.com/questions/226283/shared-library-mappings-in-proc-pid-maps    
https://unix.stackexchange.com/questions/353676/what-is-the-purpose-of-seemingly-unusable-memory-mappings-in-linux/353685#353685  
``` bash
7fae7db9f000-7fae7dc8f000 r-xp 00000000 08:05 536861                     /usr/lib/x86_64-linux-gnu/libstdc++.so.6.0.20
7fae7dc8f000-7fae7de8f000 ---p 000f0000 08:05 536861                     /usr/lib/x86_64-linux-gnu/libstdc++.so.6.0.20
7fae7de8f000-7fae7de97000 r--p 000f0000 08:05 536861                     /usr/lib/x86_64-linux-gnu/libstdc++.so.6.0.20
7fae7de97000-7fae7de99000 rw-p 000f8000 08:05 536861                     /usr/lib/x86_64-linux-gnu/libstdc++.so.6.0.20
```
这篇文章详细地介绍了`/proc/meminfo`里的每一个字段的含义和一些有用的公式.  
http://linuxperf.com/?p=142  

## 74. 不同OS的文件编码
linux显示文件内容的编码方式  
``` bash
$ file -i old.txt
old.txt: text/plain; charset=us-ascii
```
将文件abc.txt 编����方式从iso8859-1改为utf-8  
``` bash
iconv -f iso8859-1 -t utf-8 abc.txt > abc.txt.utf8
```
讲当前文件夹所有文件的文件名编码从GBK改为UTF-8, `-r`表示递归所有子文件夹  
``` bash
convmv -f GBk -t UTF-8 --notest -r *，这
```
参考: http://kuring.me/post/windows_linux_code/  

## 75. 一些shell循环命令
``` bash
while true; do cat /proc/stat  | grep "cpu " ; sleep 30; done
for n in {1..1000}; do touch a$n; rm -rf a$n; done
for file in $(ls -1 /proc/[1-9]*/status); do grep Name $file; done
```
## 76. dhcp持续请求配置 
Network管理时, 如果要在dhcp获取ip失败后不断重试,则在`ifcfg-ethX`文件里增加`PERSISTENT_DHCLIENT=yes`  
默认是1分钟后超时, 不重试,日志打印`no dhcpoffers received`  
如果加参数, 1分钟超时, 然后一个随机的时间间隔后再次重试. 一直重试到成功获取ip,日志打印如下:  
``` bash
no dhcpoffers received
no working leases in persistent database - sleeping
```
如果底层网卡有down, up动作,  dhcp进程还在, 只显示一条报错信息`receive_packet failed on eth0: Network is down`  
当通过dhcp获取ip失败后, 如果配置了持续获取, 那么下次发起请求的时间间隔是个随机值,大致为150s~450s之间.  
具体的代码如下, `retry_interval`默认是300s,且不可调整   
https://github.com/42wim/isc-dhcp/blob/f54a146c7fe88889d60f0c1aa8e6f04707f95223/client/dhclient.c    
``` c
	log_info ("No working leases in persistent database - sleeping.");
	script_init(client, "FAIL", (struct string_list *)0);
	if (client -> alias)
		script_write_params(client, "alias_", client -> alias);
	script_go(client);
	client -> state = S_INIT;
	tv.tv_sec = cur_tv.tv_sec + ((client->config->retry_interval + 1) / 2 +
		    (random() % client->config->retry_interval));
	tv.tv_usec = ((tv.tv_sec - cur_tv.tv_sec) > 1) ?
			random() % 1000000 : cur_tv.tv_usec;
	add_timeout(&tv, state_init, client, 0, 0);
	detach ();
```
NetworkManager管理时, 两个方法配置持久化:  
使用类似命令修改`nmcli connection modify enps1s0 ipv4.dhcp-timeout infinity`   
在`ifcfg-ethX`里增加`IPV4_DHCP_TIMEOUT=2147483647`  
参考 https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/networking_guide/configuring_the_dhcp_client_behavior  
 

## 77. 解析/proc/[pid]/status里关于信号的字段
``` bash
#read -p "PID=" pid
pid=$1
cat /proc/$pid/status|egrep '(Sig|Shd)(Pnd|Blk|Ign|Cgt)'|while read name mask;do
    bin=$(echo "ibase=16; obase=2; ${mask^^*}"|bc)
    echo -n "$name $mask $bin "
    i=1
    while [[ $bin -ne 0 ]];do
        if [[ ${bin:(-1)} -eq 1 ]];then
            kill -l $i | tr '\n' ' '
        fi
        bin=${bin::-1}
        set $((i++))
    done
    echo
done
# vim:et:sw=4:ts=4:sts=4:
```
参考链接: https://stackoverflow.com/questions/4155483/proc-pidstatus-sigign-field  

## 78. 审计谁杀了进程
``` bash
auditctl -a always,exit -F arch=b64 -F a1=15 -S kill -k log_kill
auditctl -a always,exit -F arch=b64 -F a1=9 -S kill -k log_kill
```
参考: https://jotdownux.wordpress.com/2016/01/23/whos-killing-that-process-whos-dumping-prelink-files-in-tmp-linux-auditd-to-the-rescue/  

## 79. 修改字符集的命令
``` bash
localectl set-locale LANG=en_US.UTF-8
localectl set-locale LANG=zh_CN.UTF-8
localectl list-locales
```

## 80. bash脚本的退出码
脚本退出码是有特殊含义的,比如常见的`127`代表脚本里的命令没找到,`130`代表用户按了`ctrl+c`导致脚本停止
``` bash
$ abc
-bash: abc: command not found
$ echo $?
127
$ sleep 1000
^C
$ echo $?
130
```
更详细的退出码含义请参见 https://tldp.org/LDP/abs/html/exitcodes.html  

## 81. 模拟不断增加内存致使触发oom的程序

``` c
 #include <stdio.h>
 #include <stdlib.h>

 int main (void) {  
         int n = 0;  

         while (1) {  
                 if (malloc(1<<20) == NULL) {  
                         printf("malloc failure after %d MiB\n", n);  
                         return 0;  
                 }  
                 printf ("got %d MiB\n", ++n);  
         }  
 }  



 $ gcc memtest1.c  
 $ ./a.out  

 got 570528 MiB  
 got 570529 MiB  
 got 570530 MiB  
 got 570531 MiBKilled
```
具体的详细测试步骤: https://access.redhat.com/solutions/47692  

## 82. vi实现十六进制编辑功能
vim配合xxd对文件进行十六进制的编辑,达到类似UltraEdit的效果
``` bash
vi abc.txt
:%!xxd
修改完后,运行下面的命令. 注意左边改动会生效,右边的文本改动不生效
:%!xxd -r
```
更详细的请看 https://www.cnblogs.com/meibenjin/archive/2012/12/06/2806396.html  

## 83. iproute软件包里的一些常用命令

`ifstat`打印网卡的一些统计信息,类似`ifconfig`里的输出,但每次运行时输出从上次运行之后这段时间的统计,而`ifconfig`是打印的从网卡up以来的累积值  
`-a`则忽略历史文件,打印从网卡up后的累积值,`-j`表示输出格式是json.方便二次处理  
``` bash
$ ifstat
#kernel
Interface        RX Pkts/Rate    TX Pkts/Rate    RX Data/Rate    TX Data/Rate
                 RX Errs/Drop    TX Errs/Drop    RX Over/Rate    TX Coll/Rate
lo                    14 0            14 0           819 0           819 0
                       0 0             0 0             0 0             0 0
eth0                  25 0            18 0          2058 0          2784 0
                       0 0             0 0             0 0             0 0
virbr0                 0 0             0 0             0 0             0 0
                       0 0             0 0             0 0             0 0
docker0                0 0             0 0             0 0             0 0
                       0 0             0 0             0 0             0 0
```
`nstat`打印协议栈里的一些统计计数,类似`netstat -s`的输出,与内核代码里的相关变量名更贴近,容易分析比较  
`-r`则忽略历史文件,打印从网卡up后的累积值,`-z`表示非0值的字段也输出  
``` bash
$ nstat
#kernel
IpInReceives                    8297               0.0
IpInDelivers                    8297               0.0
IpOutRequests                   7789               0.0
IcmpInMsgs                      6                  0.0
IcmpInErrors                    3                  0.0
IcmpInDestUnreachs              6                  0.0
IcmpOutMsgs                     6                  0.0
IcmpOutDestUnreachs             6                  0.0
```

`TcpExtListenOverflows`和`TcpExtListenDrops` 代表全队列或者半队列满了  
`TcpInCsumErrors`代表接受的包在tcp层的checksum校验不通过,被丢弃  

所有的计数项解释 https://www.kernel.org/doc/html/latest/networking/snmp_counter.html  

`lnstat`周期性输入一些内核统计数据, `-d`显示支持的具体文件和项
``` bash
$ lnstat -d
/proc/net/stat/nf_conntrack:
	 1: entries
	 2: searched
	 3: found
	 4: new
	 5: invalid
	 6: ignore
	 7: delete
	 8: delete_list
	 9: insert
	10: insert_failed
	11: drop
	12: early_drop
	13: icmp_error
	14: expect_new
	15: expect_create
	16: expect_delete
	17: search_restart
/proc/net/stat/ndisc_cache:
	 1: entries
	 2: allocs
	 3: destroys
	 4: hash_grows
	 5: lookups
	 6: hits
	 7: res_failed
	 8: rcv_probes_mcast
	 9: rcv_probes_ucast
	10: periodic_gc_runs
	11: forced_gc_runs
	12: unresolved_discards
```
`-k`可输出特定项的信息
``` bash
$ lnstat -k "entries,insert_failed"
nf_connt|nf_connt|
 entries|insert_f|
        |   ailed|
       7|       0|
       7|       0|
       7|       0|
```
这里的entris和`conntrack -L`的信息是一样的

`tc`可以模拟网络延迟,限速等功能, 下面是查看当前策略的命令  
``` bash
$ tc -s qdisc
$ tc -s qdisc ls dev eth0
```

## 84. 链接跟踪

`conntrack -L`可显示当前的所有链接信息, 需要安装`conntrack-tools`后才可以使用
``` bash
$ conntrack -L
tcp      6 430950 ESTABLISHED src=10.211.55.22 dst=10.211.55.2 sport=22 dport=51568 src=10.211.55.2 dst=10.211.55.22 sport=51568 dport=22 [ASSURED] mark=0 use=1
tcp      6 5 TIME_WAIT src=10.211.55.22 dst=113.142.161.250 sport=48530 dport=80 src=113.142.161.250 dst=10.211.55.22
```
查看当前链接跟踪表里的数目
``` bash
$ cat /proc/sys/net/netfilter/nf_conntrack_count
4
```
查看当前生效的最大值
``` bash
$ cat /proc/sys/net/netfilter/nf_conntrack_max
65536
```
如果内核出现`nf_conntrack: table full, dropping packet.`, 则需要增加链接跟踪表的最大连接数  
``` bash
sysctl -w net.nf_conntrack_max=xxxxx
```
还可以通过在加载模块时指定hashsize解决  

https://access.redhat.com/solutions/972673 介绍了针对匹配的包不进行连接跟踪的方法  
更详细的一些文章:  
https://blog.csdn.net/u010472499/article/details/78292811  
https://access.redhat.com/solutions/8721  
https://access.redhat.com/solutions/974723  
https://access.redhat.com/solutions/8721  

`sysctl -a | grep nf_` 查看和链接跟踪所有的内核参数  
具体解释: https://www.kernel.org/doc/Documentation/networking/nf_conntrack-sysctl.txt

下面的规则是用于跟踪对应连接的TCP状态, 每次连接都有自己的超时时间, 如果配置不当会导致丢包.    
比如`ESTABLISHED`的超时时间时5天, 如果改为5分钟, 且这5分钟该TCP没有任何报文交互, 则 iptables会将该连接置为invalid.   
这样即使用`ss`或者`netstat`查看该连接仍是`ESTABLISHED`, 任何发到该连接的报文全部会被丢弃.  
``` bash
    0     0 ACCEPT     all  --  *      virbr0  0.0.0.0/0            192.168.122.0/24     ctstate RELATED,ESTABLISHED
```
具体的信息见`man iptables-extensions

一些介绍链接跟踪,iptables的文章  
https://www.cnblogs.com/liushaodong/archive/2013/02/26/2933593.html  
http://arthurchiao.art/blog/conntrack-design-and-implementation/  

## 85. 一些汇编语法
如下文章介绍了x86_64下许多寄存器的用途  
http://abcdxyzk.github.io/blog/2012/11/23/assembly-args/  

## 86. 使用crash分析内核coredump的一些文章

https://irmbor.co.rs/~dspalovic/assets/docsOracle/E41138/html/ch10s02.html  
https://www.slideshare.net/PaulVNovarese/linux-crash-dump-capture-and-analysis  
https://serverfault.com/questions/475721/how-to-use-kdump-crash-to-investigate-an-oom-issue  
https://www.redhat.com/archives/crash-utility/2012-December/msg00029.html  

最主要还是看crash的官方主页: https://crash-utility.github.io/  

## 87. Linux内核模块相关
使用weak-modules实现外部开发的内核模块在多个内核(KABI兼容的情况下)都可以使用, 这篇文章介绍了具体的方法  
https://www.cnblogs.com/xingmuxin/p/9092344.html  

## 88. ssh连接保活配置
编辑 /etc/ssh/sshd_config, 添加如下两行, 重启sshd服务生效

``` bash
ClientAliveInterval 60 
ClientAliveCountMax 3 
```

## 89. 使用auditd审计功能

直接使用`systemctl restart auditd`重启auditd是失败.
``` bash
$ systemctl restart auditd
Failed to restart auditd.service: Operation refused, unit auditd.service may be requested by dependency only (it is configured to refuse manual start/stop).
See system logs and 'systemctl status auditd.service' for details.
```
可以使用`service auditd status/start/stop/restart`   
参见: https://access.redhat.com/solutions/2664811  

启动/重启auditd 报错"Not able to start Auditd service with pid file exists error"   
原因是有其他程序占用了kernel的audit功能, 可以使用`auditctl -s`查看其他程序的pid   
https://access.redhat.com/solutions/5431221  

`/var/log/audit/audit.log`里的日志格式, 默认不够人性化, 具体字段含义参见:   
https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/7/html/security_guide/sec-understanding_audit_log_files  

打印今天的审计摘要
``` bash
$ aureport --start 01/10/2020 07:00:00 --end 01/10/2020 19:00:00

Summary Report
======================
Range of time in logs: 04/27/2019 20:30:36.683 - 01/01/1970 08:00:00.000
Selected time for report: 01/10/2020 07:00:00 - 01/10/2020 19:00:00
Number of changes in configuration: 0
Number of changes to accounts, groups, or roles: 0
Number of logins: 0
Number of failed logins: 0
Number of authentications: 0
Number of failed authentications: 0
Number of users: 0
Number of terminals: 0
Number of host names: 0
Number of executables: 0
Number of commands: 0
Number of files: 0
```
昨天到今天这个时间段里的审计摘要
``` bash
$ aureport --start yesterday --end today

Summary Report
======================
Range of time in logs: 04/27/2019 20:30:36.683 - 10/01/2020 13:10:43.415
Selected time for report: 09/30/2020 00:00:00 - 10/01/2020 13:12:35
Number of changes in configuration: 46
Number of changes to accounts, groups, or roles: 0
Number of logins: 25
Number of failed logins: 2
Number of authentications: 80
Number of failed authentications: 1
Number of users: 2
Number of terminals: 16
Number of host names: 3
Number of executables: 14
Number of commands: 11
Number of files: 2
```

从昨天开始事件统计摘要, `-i`让输出更人性化.  
``` bash
$ aureport --start yesterday -e -i --summary

Event Summary Report
======================
total  type
======================
14485  CRYPTO_KEY_USER
8076  USER_START
7639  USER_END
6762  CRED_ACQ
6761  USER_ACCT
6753  LOGIN
6704  CRED_REFR
6527  CRED_DISP
4966  NETFILTER_CFG
```
统计可执行文件的摘要
``` bash
$ aureport -x -i --summary

Executable Summary Report
=================================
total  file
=================================
33791  /usr/sbin/sshd
31880  /usr/sbin/crond
7432  /usr/lib/systemd/systemd
4370  /usr/sbin/xtables-multi
651  ?
627  /usr/bin/python2.7
608  /usr/bin/login
309  /usr/bin/kmod
232  /usr/lib/systemd/systemd-update-utmp
204  /
102  /usr/sbin/libvirtd
94  /usr/sbin/tcpdump
60  /usr/bin/su
50  /usr/bin/dockerd-current
42  /usr/sbin/groupadd
```
显示每个audit日志记录的对应时间段
``` bash
$ aureport -t

Log Time Range Report
=====================
/var/log/audit/audit.log.2: 04/27/2019 20:30:36.683 - 12/01/2019 10:40:01.857
/var/log/audit/audit.log.1: 12/01/2019 10:40:01.858 - 06/08/2020 12:20:01.343
/var/log/audit/audit.log: 06/08/2020 12:20:01.358 - 10/01/2020 13:42:52.455
```
搜索今天所有的日志
``` bash
$ ausearch --start today -i
```
搜索今天所有的事件为系统调用的日志  
所有的事件列表参见: https://access.redhat.com/articles/4409591   
``` bash
ausearch --start today -i  -m syscall
```
搜索今天所有的关键字为xxxx的日志
``` bash
ausearch --start today -i  -k xxxx
```
搜索今天所有的涉及文件/etc/passwd的日志
``` bash
ausearch --start today -i  -f /etc/passwd
```

其他一些参考资料:  
https://cloud.tencent.com/developer/article/1359606  

## 90. 分析磁盘性能

blktrace -d /dev/vda
blkparse -i vda -d vda.blktrace.bin
btt -i vda.blktrace.bin -l vda.d2c_latency

参考:  
https://developer.aliyun.com/article/698568  
https://tunnelix.com/debugging-disk-issues-with-blktrace-blkparse-btrace-and-btt-in-linux-environment/  

`iostat`里`await`和`svctm`相关解释  
https://access.redhat.com/solutions/2039133  
https://access.redhat.com/articles/524353  
https://access.redhat.com/solutions/112613  

## 91. Grub相关问题

CentOS 6 和7 如何重装grub  
https://access.redhat.com/solutions/1521   

## 92. SLAB相关的知识

统计slab内各项的内存占用并降序排列TOP 10  
``` bash
awk '{printf "  %6i MB %s \n",$6*$15/256,$1}' /proc/slabinfo | sort -nrk1 | head -10
```

## 93. nfs相关的知识

nfs Debug  
https://access.redhat.com/solutions/262213  
https://access.redhat.com/solutions/1460313  
https://access.redhat.com/solutions/4253191  
https://access.redhat.com/solutions/2948091  
https://access.redhat.com/solutions/3765711  
https://access.redhat.com/solutions/28211  

nfs, rpc相关的Debug开关  
https://wiki.archlinux.org/index.php/NFS/Troubleshooting#RPC_debug_flags  

## 94. fork创建进程时的几个报错说明
有两个常见的报错:
``` bash
11: Resource temporarily unavailable
12: Cannot allocate memory
```

在fork等创建进程的操作里, 当达到`nproc`的限制， 即用户的最大进程数， 报错`Resource temporarily unavailable`   （这条规则对root用户无效）
如果在文件里对`nproc`配置为`ulimited` 这个值是根据内存算出来的， 公式可参考  
https://thelinuxcluster.com/2020/05/14/how-is-the-nproc-hard-limit-calculated-and-how-do-we-change-the-value-on-centos-7/  

当达到系统级参数pid_max限制，无法分配出pid时， 报错为`Cannot allocate memory`

`sysctl kernel.pid_max`查询当前的最大值, pid_max默认是32768， 64位系统， 最大可配置为4百万左右  
`kernel.threads-max` 也控制系统能创建的最大进程/线程数, 因为它的默认值非常大. 一般都没关注过. 总是`kernel.pid_max`先超出限制.  
如下是相关代码:
linux-3.10.0-957.21.3.el7\include\linux\threads.h 
``` c
/*
 * This controls the default maximum pid allocated to a process
 */
#define PID_MAX_DEFAULT (CONFIG_BASE_SMALL ? 0x1000 : 0x8000)

/*
 * A maximum of 4 million PIDs should be enough for a while.
 * [NOTE: PID/TIDs are limited to 2^29 ~= 500+ million, see futex.h.]
 */
#define PID_MAX_LIMIT (CONFIG_BASE_SMALL ? PAGE_SIZE * 8 : \
	(sizeof(long) > 4 ? 4 * 1024 * 1024 : PID_MAX_DEFAULT))
```
