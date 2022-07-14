---
title: "Linux Boot过程总结"
author: "Peter Wang"
tags: ["linux", "boot", "systemd"]
date: 2020-04-19T15:17:50+08:00
draft: false
---

记录linux启动过程的总结

<!--more-->

## bios启动
磁盘的前512字节内容也叫也叫Master boot record, 简称MBR
主板里的bios会扫描设备/磁盘MBR的最后两个字节是不是`aa55`,如果是则认为是可启动设备. 会按照配置的启动顺序挨个尝试启动.

``` bash
[root@localhost ~]# xxd -l 512 /dev/sda
0000000: eb63 9010 8ed0 bc00 b0b8 0000 8ed8 8ec0  .c..............
0000010: fbbe 007c bf00 06b9 0002 f3a4 ea21 0600  ...|.........!..
0000020: 00be be07 3804 750b 83c6 1081 fefe 0775  ....8.u........u
0000030: f3eb 16b4 02b0 01bb 007c b280 8a74 018b  .........|...t..
0000040: 4c02 cd13 ea00 7c00 00eb fe00 0000 0000  L.....|.........
0000050: 0000 0000 0000 0000 0000 0080 0100 0000  ................
0000060: 0000 0000 fffa 9090 f6c2 8074 05f6 c270  ...........t...p
0000070: 7402 b280 ea79 7c00 0031 c08e d88e d0bc  t....y|..1......
0000080: 0020 fba0 647c 3cff 7402 88c2 52be 057c  . ..d|<.t...R..|
0000090: b441 bbaa 55cd 135a 5272 3d81 fb55 aa75  .A..U..ZRr=..U.u
00000a0: 3783 e101 7432 31c0 8944 0440 8844 ff89  7...t21..D.@.D..
00000b0: 4402 c704 1000 668b 1e5c 7c66 895c 0866  D.....f..\|f.\.f
00000c0: 8b1e 607c 6689 5c0c c744 0600 70b4 42cd  ..`|f.\..D..p.B.
00000d0: 1372 05bb 0070 eb76 b408 cd13 730d 5a84  .r...p.v....s.Z.
00000e0: d20f 83de 00be 857d e982 0066 0fb6 c688  .......}...f....
00000f0: 64ff 4066 8944 040f b6d1 c1e2 0288 e888  d.@f.D..........
0000100: f440 8944 080f b6c2 c0e8 0266 8904 66a1  .@.D.......f..f.
0000110: 607c 6609 c075 4e66 a15c 7c66 31d2 66f7  `|f..uNf.\|f1.f.
0000120: 3488 d131 d266 f774 043b 4408 7d37 fec1  4..1.f.t.;D.}7..
0000130: 88c5 30c0 c1e8 0208 c188 d05a 88c6 bb00  ..0........Z....
0000140: 708e c331 dbb8 0102 cd13 721e 8cc3 601e  p..1......r...`.
0000150: b900 018e db31 f6bf 0080 8ec6 fcf3 a51f  .....1..........
0000160: 61ff 265a 7cbe 807d eb03 be8f 7de8 3400  a.&Z|..}....}.4.
0000170: be94 7de8 2e00 cd18 ebfe 4752 5542 2000  ..}.......GRUB .
0000180: 4765 6f6d 0048 6172 6420 4469 736b 0052  Geom.Hard Disk.R
0000190: 6561 6400 2045 7272 6f72 0d0a 00bb 0100  ead. Error......
00001a0: b40e cd10 ac3c 0075 f4c3 0000 0000 0000  .....<.u........
00001b0: 0000 0000 0000 0000 ab83 0a00 0000 8020  ...............
00001c0: 2100 83fe ffff 0008 0000 dfc7 8102 0000  !...............
00001d0: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00001e0: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00001f0: 0000 0000 0000 0000 0000 0000 0000 55aa  ..............U.
```

MBR里还有分区表信息, 从偏移量`446`开始, 最多放4个主分区, 下面显示只有一个主分区
``` bash
[root@localhost ~]# xxd -s 446 -l 64 /dev/sda
00001be: 8020 2100 83fe ffff 0008 0000 dfc7 8102  . !.............
00001ce: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00001de: 0000 0000 0000 0000 0000 0000 0000 0000  ................
00001ee: 0000 0000 0000 0000 0000 0000 0000 0000  ................
```

如果分区损坏, 可使用testdisk尝试修复, 有linux和window两个版本. 
主页: www.cgsecurity.org

在qemu+libvirt下, bios启动会打印`Booting from Hard Disk...`信息.代码如下:

``` c
    switch (ie->type) {
    case IPL_TYPE_FLOPPY:
        printf("Booting from Floppy...\n");
        boot_disk(0x00, CheckFloppySig);
        break;
    case IPL_TYPE_HARDDISK:
        printf("Booting from Hard Disk...\n");
        boot_disk(0x80, 1);
```
如果检查发现`mbr`的512字节处不是`55aa`, 则无法启动虚拟机, 界面显示`Boot failed: not a bootable disk`, 对应代码如下
``` c
        if (GET_FARVAR(bootseg, mbr->signature) != MBR_SIGNATURE) {
            printf("Boot failed: not a bootable disk\n\n");
            return;
        }
```
所以VNC遇到如上两个信息, 需要检查底层问题.

以上代码来自https://www.seabios.org/downloads/, 是qemu默认的bios启动程序


## grub启动
bios读取MBR后,然后执行里面的代码, 这样将控制权交到grub2. 这块代码也叫`bootloader`.  
通常运行`grub2-install /dev/sda`将`bootloader`写入MBR. 当然还会在512字节后面继续写入一些文件
可以加参数`--debug`看到更详细的信息

如果发现grub损坏, 可以尝试挂盘并chroot到根目录, 执行`grub2-install /dev/xxxx`. /dev/xxx为具体的盘符名  
如果能看到grub的shell命令行, 说明可能grub.cfg配置有误, 导致无法选择具体的引导项. 可以手工指定具体的引导信息, 尝试启动  
以下是参考样例, 可以找一台完全一样的主机配置会修复故障机  
`ls`命令可以查看当前设备及里面的文件, 用于确定文件是否真的存在. 也能判断分区信息  
`tab`可用于命令联想  
``` bash
        set root='hd0,msdos1'
        linux16 /boot/vmlinuz-3.10.0-1062.el7.x86_64 root=UUID=5de1c8df-9b03-4830-9b56-b96a2290b78f ro vconsole.keymap=us crashkernel=auto
        initrd16 /boot/initramfs-3.10.0-1062.el7.x86_64.img
```
有时挂盘修复时choot后好多特殊的文件系统找不到, 可以提前手工挂载下, 然后chroot  
如下命令仅供参考, 假设要修复的系统盘已经挂在`mnt`  
``` bash
# mount --bind /dev /mnt/dev
# mount -t proc proc /mnt/proc
# mount -t sysfs none /mnt/sys
# chroot /mnt /bin/bash
```

有时我们需要检查磁盘或者分区当前的文件系统, 下面列出三种方法:
``` bash
[root@localhost ~]# lsblk -f
NAME   FSTYPE LABEL UUID                                 MOUNTPOINT
sda
└─sda1 ext4         5de1c8df-9b03-4830-9b56-b96a2290b78f /
sr0
[root@localhost ~]# blkid
/dev/sda1: UUID="5de1c8df-9b03-4830-9b56-b96a2290b78f" TYPE="ext4"
[root@localhost ~]# file -s /dev/sda1
/dev/sda1: Linux rev 1.0 ext4 filesystem data, UUID=5de1c8df-9b03-4830-9b56-b96a2290b78f (needs journal recovery) (extents) (64bit) (large files) (huge files)
```
这几个命令都是通过直接读取该块设备的十六进制数据来判断的, 具体的规则可参考:  
https://github.com/file/file/blob/master/magic/Magdir/filesystems

## initramfs启动
grub2找到kernel和initramfs后, 控制权交给kernel, 然后解压缩initramfs在内存中创建一个rootfs
在这个初始的小型文件系统里,加载一些基本的内核模块, 使OS能识别一些关键的外围设备. 比方说virtio块设备, virtio网络设备
这就是为什么在CentOS7下要将kvm驱动通过`dracut`打入initramfs的原理. 如果无法识别硬盘, 那么就无法真正的mount到磁盘的根目录.  
当initramfs文件系统挂在后, kernel将控制权交给pid为1的进程, centos7下是systemd.  
VNC屏幕打印`Welcome to XXXX`意味着initramfs里的systemd已经开始运行. 之后出现的问题和内核就没多大关系了  

https://github.com/systemd/systemd/blob/4444e8533fea1640cc9d9b1d1a493ffcbee8a13d/src/core/main.c
``` c
        if (log_get_show_color())
                return status_printf(NULL, 0,
                                     "\nWelcome to \x1B[%sm%s\x1B[0m!\n",
                                     isempty(ansi_color) ? "1" : ansi_color,
                                     isempty(pretty_name) ? "Linux" : pretty_name);
```
大致的顺序如下:  
1. dracut-cmdline解析`/proc/cmdline`, 找到真实root的信息  
2. udev启动,识别所有的设备, 特别是硬盘,在/dev/下生成相应的信息, 这里当识别到新设备时会加载相应的驱动  
   bus驱动通过特殊的ID(设备厂商ID, 子系统ID等)识别新设备, 这个也叫MODALIAS  
   然后modprobe MODALIAS, 会读取/lib/module/xxxx/modules.alias, 找到对应的驱动来加载驱动.  
   对应的规则为`/lib/udev/rules.d/80-drivers.rules:ENV{MODALIAS}=="?*", RUN{builtin}+="kmod load $env{MODALIAS}"`  
3. initqueue阶段,有很多循环, 不停地检查一些关键任务是否完成, 比如root设备是否已识别并在`/dev/`下完成相关文件创建  
4. mount和fsck root设备  
5. 清理就切换到真实的root设备   

可以在Grub菜单里给内核加参数`rd.break`使系统停留在initramfs创建后, 切换到真正的root文件系统前. 用于学习和排障  
`rd`就是`ramdisk`的缩写, 即`the initial ramdisk (initrd) environment`  
`rd.debug` 可以输出详细的日志. dracut许多命令都是shell脚本. 打印详细日志的大致两种:  
脚本里加`set -x`
``` bash
$ cat sleep.sh
#!/usr/bin/bash
set -x
sleep 3
$ ./sleep.sh
+ sleep 3
[root@localhost ~]#
```
再`set -x`的基础上,继续增加`export 'PS4=${BASH_SOURCE}@${LINENO}(${FUNCNAME[0]}): '` 可打印具体的行数和函数名
``` bash
$ cat sleep.sh
#!/usr/bin/bash
set -x
export 'PS4=${BASH_SOURCE}@${LINENO}(${FUNCNAME[0]}): '
sleep 3
$ ./sleep.sh
+ export 'PS4=${BASH_SOURCE}@${LINENO}(${FUNCNAME[0]}): '
+ PS4='${BASH_SOURCE}@${LINENO}(${FUNCNAME[0]}): '
./sleep.sh@4(): sleep 3
```
如下文档介绍了bash下面PS相关变量可以实现的一些特殊功能  
https://www.thegeekstuff.com/2008/09/bash-shell-take-control-of-ps1-ps2-ps3-ps4-and-prompt_command/   

`rd.udev.debug ` 可以输入udev的详细日志  

centos7还支持如下参数, 可以在特定的阶段打断OS的正常运行.
``` bash
[root@localhost ~]# grep -r "rd.break=" /lib/dracut/modules.d/*systemd/*service
/lib/dracut/modules.d/98systemd/dracut-cmdline.service:ConditionKernelCommandLine=|rd.break=cmdline
/lib/dracut/modules.d/98systemd/dracut-initqueue.service:ConditionKernelCommandLine=|rd.break=initqueue
/lib/dracut/modules.d/98systemd/dracut-mount.service:ConditionKernelCommandLine=|rd.break=mount
/lib/dracut/modules.d/98systemd/dracut-pre-mount.service:ConditionKernelCommandLine=|rd.break=pre-mount
/lib/dracut/modules.d/98systemd/dracut-pre-trigger.service:ConditionKernelCommandLine=|rd.break=pre-trigger
/lib/dracut/modules.d/98systemd/dracut-pre-udev.service:ConditionKernelCommandLine=|rd.break=pre-udev
```
initramfs大部分问题都可以通过重建initramfs解决  

提取initramfs文件的命令:  
``` bash
mkdir /tmp/initrd
cd /tmp/initrd
/usr/lib/dracut/skipcpio /boot/initramfs-$(uname -r).img | gunzip -c | cpio -idmv
```
https://access.redhat.com/solutions/2037313  

查看initramfs文件里包含的文件列表, 使用`lsinitrd xxx`, 如果要查看具体文件的内容,用如下命令:
``` bash
$ lsinitrd /boot/initramfs-3.10.0-1062.el7.x86_64.img -f /etc/machine-id
ab80e79ed1cf4e9aa1108082dd40f5bc
```

挂盘到一个虚拟机里, chroot到对应的root目录, 已3.10.0-1062.el7.x86_64为例,命令为:  
`dracut initramfs-3.10.0-1062.el7.x86_64.img 3.10.0-1062.el7.x86_64`  
不要不加参数执行`dracut`, 因为它默认会使用当前的内核生成文件. 当前内核可能不是故障虚拟机里的内核版本  

单用户 reboot, 可以使用reboot -f  

运行initrd-switch-root.service完成其他工作并改变根目录为/sysroot, 系统打印如下:
``` bash
Apr 20 21:33:52 localhost.localdomain systemd[1]: Starting Switch Root...
Apr 20 21:33:52 localhost.localdomain systemd[1]: Switching root.
```

## 切换到真实的根目录
此时会remount根目录, 然后依照依赖关系并发的启动各种功能服务  
systemd与传统sysint不同, 随OS启动的服务如果之前没有依赖关系, 是可以同时启动的. 这有别于sysinit的串行一个一个执行, 但对于定位启动类卡住问题却带来的难度. 不能简单的通过控制台显示的最后一行信息来判断是否该服务出问题  

正常启动的情况下, 我们看到一个登陆界面, 让输入用户名和密码, 这个是因为getty服务正常运行了  
``` bash
[root@localhost ~]# systemctl status getty@tty1.service
● getty@tty1.service - Getty on tty1
   Loaded: loaded (/usr/lib/systemd/system/getty@.service; enabled; vendor preset: enabled)
   Active: active (running) since Mon 2020-04-20 22:01:32 HKT; 24s ago
     Docs: man:agetty(8)
           man:systemd-getty-generator(8)
           http://0pointer.de/blog/projects/serial-console.html
 Main PID: 5474 (agetty)
   CGroup: /system.slice/system-getty.slice/getty@tty1.service
           └─5474 /sbin/agetty --noclear tty1 linux

Apr 20 22:01:32 localhost.localdomain systemd[1]: Stopped Getty on tty1.
Apr 20 22:01:32 localhost.localdomain systemd[1]: Started Getty on tty1.
[root@localhost ~]# lsof -p 5474 | grep tty1
agetty  5474 root    0u   CHR    4,1       0t0  5636 /dev/tty1
agetty  5474 root    1u   CHR    4,1       0t0  5636 /dev/tty1
agetty  5474 root    2u   CHR    4,1       0t0  5636 /dev/tty1
[root@localhost ~]#
```

如果系统卡住没有看到这个界面, 则继续等待几分钟, 观察是否自动进入应急模式:  
如果进入, 则输入root后, 运行`journalctl`查看具体的问题  
如果无法进入, 重新启动, 输入内核参数`systemd.debug-shell=1`, 它会在systemd启动的早期在tty9运行一个shell, 用户在vnc上运行`CTRL+ALT+F9`可登陆, 运行`systemctl list-jobs`查看具体哪个服务卡住  

`systemctl list-jobs` 打印状态可以是"starting"或者"waiting"  
"starting"的服务是可能引发问题的服务, 正式因为它一直运行, 所有其他相关服务处于"waiting"状态  

当并未切换到真实目录时,即界面卡在"Switch root", 此时是无法启动上面的debug-shell, 需要开启systemd自身的debug日志级别  
同时这也说明initramfs里面的systemd是OK的, 只是启动真实跟盘上的systemd出现异常了, 可以在initramfs阶段 手工chroot到/sysroot里执行
`rpm -V systemd`, `rpm -V glibc`, `rpm -V bash` 等命令查询下基础组件是否有损坏

## 与kdump相关的initramfs知识

有两个方法判断是否crashkernel生效
``` bash
$ dmesg -T | grep "for crashkernel"
[Wed Sep  9 22:24:54 2020] Reserving 128MB of memory at 720MB for crashkernel (System RAM: 1535MB)
$ cat /sys/kernel/kexec_crash_size
134217728
```

`systemctl start kdump`的作用是检查内核参数, 生成含kdump相关功能的initramfs.  
通过IN_KDUMP这个环境变量,使重建的initramfs里含有kdump所有的脚本和命令. 这样一旦转储,新的initramfs里就可以sava vmcore了  
``` bash
root@localhost ~]# head /sbin/mkdumprd
#!/bin/bash --norc
# New mkdumprd
#
# Copyright 2011 Red Hat, Inc.
#
# Written by Cong Wang <amwang@redhat.com>
#

. /lib/kdump/kdump-lib.sh
export IN_KDUMP=1
```
`/etc/kdump.conf`是关于kdump的配置项, 可给initramfs添加文件或者内核参数,调整转储失败时的动作等.  




## 参考
* https://freedesktop.org/wiki/Software/systemd/Debugging/
* https://www.freedesktop.org/software/systemd/man/bootup.html
* https://www.freedesktop.org/software/systemd/man/systemctl.html
* https://www.freedesktop.org/software/systemd/man/systemd.service.html
* https://www.linux.com/training-tutorials/understanding-and-using-systemd/  
* https://people.redhat.com/harald/dracut.html
* https://man7.org/linux/man-pages/man8/dracut.8.html
* https://fedoraproject.org/wiki/How_to_debug_Dracut_problems
* https://documentation.suse.com/sles/12-SP4/html/SLES-all/cha-udev.html
* https://wiki.archlinux.org/index.php/udev