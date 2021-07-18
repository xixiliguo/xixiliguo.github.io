---
title: "使用Yum 升级OS"
author: "Peter Wang"
tags: ["yum"]
date: 2019-06-12T00:12:08+08:00
draft: false
---

主要介绍使用yum 升级OS软件包的一些细节

<!--more-->

# Repo源

每个源下面有个`repodata`这个文件夹, 该文件夹存放着软件包的元数据(包名,路径,版本,依赖关系)  
比如`https://mirrors.tuna.tsinghua.edu.cn/centos/7.6.1810/os/x86_64/`  
下面的repodata里 `25cd2c29e5adb2b6f8a5b091237dd9f760e97815b37f2557f2cd1c12a5f294f0-primary.xml.gz` 文件就是元数据文件    

## 创建Repo源的操作
已`/opt/mirrors/CentOS7`为例:
``` bash
mkdir -p CentOS7/Packages
```
将所有软件rpm包上传到文件夹`Packages`
``` bash
cd /opt/mirrors/CentOS7
createrepo .
```
该操作会生成`yum`会用到的元数据,并放入到`repodata`目录.  
并不一定非要创建`Packages`目录, `createrepo`会自动查找指定目录及其子目录. `Packages`是个很好的约定,方便管理  
rpm包是集合, 含有二进制文件, 版本信息, 依赖关系等. `createrepo`通过读取每个rpm的信息,并生成元数据.  
这样`yum`在分析时只需要下载元数据,就可以得知该源有哪个软件,什么版本等.不必每次下载源里的包.  

我们使用`yum checkupdate`等命令时, 假设访问`xxx/CentOS7`, `yum`会检查是否有`xxx/CentOS7/repodata`这个目录,并获取相应的元数据.

# rpm相关操作

## rpmsave与rpmnew
rpm的spec文件里可以指定新版配置文件的升级方式  
默认升级时旧版本有改动,则用新版本替换旧版本的文件. 旧版本的文件改名为XXXX.rpmsave  
如果spec文件里指定为`%config(noreplace)`, 则升级时旧版本有改动, 保留旧文件,新版本文件改为XXXX.rpmnew  
这里的改动指新版本的rpm里对比旧版本rpm里的默认文件.  并非拿可能被用户修改过的文件和新版本里的文件对比  
如果文件不存在(比如人为删除), 升级时会重新生成该文件， 不管是configfile还是 noconfigfile  

卸载时对于`%config(noreplace)`的文件,如果有改动,则不会删除,改名为XXXX.rpmsave  

https://blog.csdn.net/xukunddp/article/details/6409795 有相关解释    
https://www.cl.cam.ac.uk/~jw35/docs/rpm_config.html  描述了各种改动场景下的结果

如果没有spec文件, 可通过如下步骤从已安装的软件包确认下配置文件的覆盖方式  
比较文件的flags是否 第5个Bit位位1.   即 XX & (1<<4) 是否非0  
显示`/etc/pam.d/sshd`,`/etc/ssh/sshd_config`,`/etc/sysconfig/sshd`的属性是 %config(noreplace)  

``` bash
# rpm -q --qf '[%{filenames}: %{fileflags}\n]' openssh-server
/etc/pam.d/sshd: 17
/etc/ssh/sshd_config: 17
/etc/sysconfig/sshd: 17
/usr/lib/systemd/system/sshd-keygen.service: 0
/usr/lib/systemd/system/sshd.service: 0
/usr/lib/systemd/system/sshd.socket: 0
/usr/lib/systemd/system/sshd@.service: 0
/usr/lib64/fipscheck/sshd.hmac: 0
/usr/libexec/openssh/sftp-server: 0
/usr/sbin/sshd: 0
/usr/sbin/sshd-keygen: 0
/usr/share/man/man5/moduli.5.gz: 2
/usr/share/man/man5/sshd_config.5.gz: 2
/usr/share/man/man8/sftp-server.8.gz: 2
/usr/share/man/man8/sshd.8.gz: 2
/var/empty/sshd: 0
```
``` bash
# grep -r RPMFILE_NOREPLACE /usr/include/
/usr/include/rpm/rpmfi.h:    RPMFILE_NOREPLACE	= (1 <<  4),	/*!< from %%config(noreplace) */
```
参考: https://www.redhat.com/archives/rpm-list/2003-October/msg00140.html  

## 查询依赖关系
检查软件提供哪些capability
``` bash
# rpm -q --provides openssh-server
config(openssh-server) = 7.4p1-16.el7
openssh-server = 7.4p1-16.el7
openssh-server(x86-64) = 7.4p1-16.el7
```
检查软件需要哪些capability
``` bash
# rpm -q --requires openssh-server
/bin/bash
/bin/sh
/bin/sh
/bin/sh
/bin/sh
/usr/sbin/useradd
config(openssh-server) = 7.4p1-16.el7
fipscheck-lib(x86-64) >= 1.3.0
libaudit.so.1()(64bit)
libc.so.6()(64bit)
libc.so.6(GLIBC_2.14)(64bit)
libc.so.6(GLIBC_2.16)(64bit)
libc.so.6(GLIBC_2.17)(64bit)
libc.so.6(GLIBC_2.2.5)(64bit)
libc.so.6(GLIBC_2.3)(64bit)
libc.so.6(GLIBC_2.3.4)(64bit)
libc.so.6(GLIBC_2.4)(64bit)
libc.so.6(GLIBC_2.8)(64bit)
libcom_err.so.2()(64bit)
libcrypt.so.1()(64bit)
libcrypt.so.1(GLIBC_2.2.5)(64bit)
libcrypto.so.10()(64bit)
libcrypto.so.10(OPENSSL_1.0.1_EC)(64bit)
libcrypto.so.10(OPENSSL_1.0.2)(64bit)
libcrypto.so.10(libcrypto.so.10)(64bit)
libdl.so.2()(64bit)
libfipscheck.so.1()(64bit)
libgssapi_krb5.so.2()(64bit)
libgssapi_krb5.so.2(gssapi_krb5_2_MIT)(64bit)
libk5crypto.so.3()(64bit)
libkrb5.so.3()(64bit)
libkrb5.so.3(krb5_3_MIT)(64bit)
liblber-2.4.so.2()(64bit)
libldap-2.4.so.2()(64bit)
libpam.so.0()(64bit)
libpam.so.0(LIBPAM_1.0)(64bit)
libresolv.so.2()(64bit)
libselinux.so.1()(64bit)
libsystemd.so.0()(64bit)
libsystemd.so.0(LIBSYSTEMD_209)(64bit)
libutil.so.1()(64bit)
libutil.so.1(GLIBC_2.2.5)(64bit)
libwrap.so.0()(64bit)
libz.so.1()(64bit)
openssh = 7.4p1-16.el7
pam >= 1.0.1-3
rpmlib(CompressedFileNames) <= 3.0.4-1
rpmlib(FileDigests) <= 4.6.0-1
rpmlib(PayloadFilesHavePrefix) <= 4.0-1
rtld(GNU_HASH)
systemd-units
systemd-units
systemd-units
rpmlib(PayloadIsXz) <= 5.2-1
```
根据capability,查询哪个包提供
``` bash
# rpm -q --whatprovides pam
pam-1.1.8-22.el7.x86_64
# rpm -q --whatprovides libsystemd.so.0\(\)\(64bit\)
systemd-libs-219-62.el7_6.6.x86_64
```

查询哪个包需要某个特定的capability
``` bash
# rpm -q --whatrequires pam
passwd-0.79-4.el7.x86_64
cronie-1.4.11-20.el7_6.x86_64
util-linux-2.23.2-59.el7_6.1.x86_64
openssh-server-7.4p1-16.el7.x86_64
authconfig-6.2.8-30.el7.x86_64
# rpm -q --whatrequires libsystemd.so.0\(\)\(64bit\)
dbus-libs-1.10.24-13.el7_6.x86_64
dbus-1.10.24-13.el7_6.x86_64
polkit-0.112-18.el7_6.1.x86_64
util-linux-2.23.2-59.el7_6.1.x86_64
openssh-server-7.4p1-16.el7.x86_64
rsyslog-8.24.0-34.el7.x86_64
procps-ng-3.3.10-23.el7.x86_64
```

如果要查询本地rpm软件包的信息, 需要使用`-p`  
比如之前是`rpm -ql bpftool`, 要改为`rpm -ql -p bpftool-3.10.0-957.el7.x86_64.rpm`  

如果要查询的包,文件或者capability, 不在本地已安装的包里, 可以使用`repoquery`从已知源中查询  
例如查询哪个包提供了`strace`这个capability:  
``` bash
$ repoquery --whatprovides strace
strace-0:4.12-9.el7.x86_64
```
repoquery不仅支持从源中查,还会从本地已安装的信息来查.

## SPEC文件
rpm的构建过程需要源代码和`spec`文件.
`spec`文件用于描述rpm的元数据信息和指导如何编译,打包,封装为二进制的rpm文件

跟着如下教程, 自己可以从xxx.src.rpm编译出xxx.rpm文件.  常用于问题定位,增加日志等.  
https://blog.packagecloud.io/eng/2015/04/20/working-with-source-rpms/  

下面两篇文章介绍了SPEC的语法:  
https://fedoraproject.org/wiki/How_to_create_am_RPM_package/zh-cn  
https://rpm-packaging-guide.github.io  

## 其他
本地rpm包解压缩  
``` bash
rpm2cpio xxx.rpm | cpio -div
```

# yum相关操作
`yum`的主要代码在`/usr/lib/python2.7/site-packages/yum/`  
`class YumBase` 是主要的类, 含大部分操作  
``` python
class YumBase(depsolve.Depsolve):
    """This is a primary structure and base class. It houses the
    objects and methods needed to perform most things in yum. It is
    almost an abstract class in that you will need to add your own
    class above it for most real use.
    """
```
yum所有的操作,都是分析具体的操作(删除,更新,新安装),进而分析相关的依赖, 比如更新时,检查依赖是否满足,不满足也要将依赖的包进程更新.   
分析完后将对应包和状态(比如updated, erase等)放入事务中,然后执行具体的操作  

查询特定软件依赖哪些包
``` bash
# yum deplist rsync
Loaded plugins: fastestmirror
Loading mirror speeds from cached hostfile
 * base: mirrors.cqu.edu.cn
 * extras: mirror.jdcloud.com
 * updates: mirrors.aliyun.com
package: rsync.x86_64 3.1.2-6.el7_6.1
  dependency: /bin/sh
   provider: bash.x86_64 4.2.46-31.el7
  dependency: libacl.so.1()(64bit)
   provider: libacl.x86_64 2.2.51-14.el7
  dependency: libacl.so.1(ACL_1.0)(64bit)
   provider: libacl.x86_64 2.2.51-14.el7
  dependency: libattr.so.1()(64bit)
   provider: libattr.x86_64 2.4.46-13.el7
  dependency: libattr.so.1(ATTR_1.0)(64bit)
   provider: libattr.x86_64 2.4.46-13.el7
  dependency: libc.so.6(GLIBC_2.15)(64bit)
   provider: glibc.x86_64 2.17-260.el7_6.5
  dependency: libpopt.so.0()(64bit)
   provider: popt.x86_64 1.13-16.el7
  dependency: libpopt.so.0(LIBPOPT_0)(64bit)
   provider: popt.x86_64 1.13-16.el7
  dependency: rtld(GNU_HASH)
   provider: glibc.x86_64 2.17-260.el7_6.5
   provider: glibc.i686 2.17-260.el7_6.5
  dependency: systemd-units
   provider: systemd.x86_64 219-62.el7_6.6
  dependency: zlib
   provider: zlib.x86_64 1.2.7-18.el7
   provider: zlib.i686 1.2.7-18.el7
```

## history相关操作
https://www.cyberciti.biz/faq/yum-history-command  

## yum update 与 yum update-to 的区别
yum 有两种升级命令， yum update 和 yum update-to  
yum update kernel 会升级Repo里的最新版  
yum update kernel-3.10.0-327.62.59.83.h108.x86_64 会升级到指定版本。 但如果这个指定版本就是当前已安装的版本， 则自动升级到repo里的最新版。  


yum update-to kernel-3.10.0-327.62.59.83.h108.x86_64 升级到指定版本， 如果这个指定版本就是当前已安装的版本， 则不升级  
但是yum update-to kernel则会升级多个高版本的内核。 因为yum update-to 一般要求就是软件包的版本信息  

## yum update
没有指定的软件包,则升级所有软件, 主要逻辑代码在`/usr/lib/python2.7/site-packages/yum/__init__.py`里类`YumBase`的函数`update`  
加`-v`可打印详细的日志   
1. 使用rpm模块, 通过`dbMatch`获取已安装软件的所有信息   
2. 连接repo, 获取所有availble 的软件包信息  
3. 精简newpkg的列表,比如只保留软件包的最新版本  
4. 完成依赖关系检查, 主要是检查依赖项和冲突项  
5. 用户确认OK后,执行下载,升级操作   
  
如下下yum的包状态, 打印Debug日志时可以对照分析    
``` 
           i = the package will be installed
           u = the package will be an update
           e = the package will be erased
           r = the package will be reinstalled
           d = the package will be a downgrade
           o = the package will be obsoleting another package
           ud = the package will be updated
           od = the package will be obsoleted
```

## yum downgrade
`yum history undo`, 这里undo的是升级事务, 则内部调用的是`yum downgrader`  
主要执行入口在类`YumBase`的函数`history_redo`  
``` python
for pkg in transaction.trans_data:
            if pkg.state == 'Updated':
                try:
                    if self.downgrade(pkgtup=pkg.pkgtup):
                        done = True
                except yum.Errors.DowngradeError:
                    self.logger.critical(_('Failed to downgrade: %s'), pkg)
```
加`-v`可打印详细的日志  
主要是删除已安装的包, 然后`yum update`指定的新包.  
这里删除已安装的包, 很容易删掉其他依赖包. 导致问题.  如下是删除包的一些描述  
```
Are  used  to  remove  the  specified packages from the system as well as removing any packages which depend on the package being removed. remove operates on
              groups, files, provides and filelists just like the "install" command.(See Specifying package names for more information)

              Note that "yum" is included in the protected_packages configuration, by default.  So you can't accidentally remove yum itself.

              The remove_leaf_only configuration changes the behaviour of this command to only remove packages which aren't required by something else.

              The clean_requirements_on_remove configuration changes the behaviour of this command to also remove packages that are only dependencies of this package.

              Because remove does a lot of work to make it as easy as possible to use, there are also a few specific remove commands "remove-n", "remove-na"  and  "remove-
              nevra". These only work on package names, and do not process wildcards etc.
```
## 其他

`yum list installed`的结果并不等于`rpm -qa`. `rpm -qa`会多`gpg-pubkey`这个软件包. 解释如下:  
https://unix.stackexchange.com/questions/190203/what-are-gpg-pubkey-packages  


可以使用python库`rpm`来比较软件包的版本. `rpm.labelCompare((an,av,ar),(bn,bv,br))`  
返回值1 表示a较新. 0 相等. -1 b较新. 下面是具体的例子:
``` bash
# python
Python 2.7.5 (default, Apr  9 2019, 14:30:50)
[GCC 4.8.5 20150623 (Red Hat 4.8.5-36)] on linux2
Type "help", "copyright", "credits" or "license" for more information.
>>> import rpm
>>> rpm.labelCompare(("systemd","219","62.el7_6.6"),("systemd","219","63.el7_6.6"))
-1
>>> exit()
```
https://stackoverflow.com/questions/3206319/how-do-i-compare-rpm-versions-in-python  




# 升级前检查
* 检查repo里是否有当前OS已安装的软件包. 方便回退.   
以下两个命令等价  
``` bash
package-cleanup --orphans
yum list extras
```
代码看是通过`/usr/share/yum-cli/cli.py`里类`YumBaseCli`的函数`returnPkgLists`, 进一步调用类`YumBase`的函数`doPackageLists` 实现  

* 检查本地rpm数据库是否由依赖问题, 相当于升级前校验

``` bash
package-cleanup --problems
```
通过`rpmdb.check_dependencies()`实现  


* 模拟`yum update`但不真正升级, 检查是否报错. 相当于dry-run. 原理是对每次确认选择都是`no`

``` bash
yum update --assumeno 
```
使用`echo $?`检查上述命令的返回码. 非零表明有异常.  

# 升级
* 升级命令

``` bash
yum update -y
```

# 升级后检查

* 检查哪些进程需要重启,才能使用新的软件包或者库  
``` bash
# needs-restarting
1 : /usr/lib/systemd/systemd --system --deserialize 16
443 : login -- root
3838 : sshd: root@pts/3
1009 : /sbin/dhclient -H localhost -1 -q -lf /var/lib/dhclient/dhclient--eth0.lease -pf /var/run/dhclient-eth0.pid eth0
2221 : sshd: root@pts/0
```

原理:  
在`/proc`下遍历所有`pid`下面的`smaps`文件, 获取所有打开文件的信息   
检查这些文件对应的rpm包的安装时间  
和进程的启动时间对比, 如果rpm的时间晚,则打印出来  
具体可以查看`/usr/bin/needs-restarting`, 它是一个py脚本  

细节:  
通过`/proc/[pid]/stat`下的信息和os的`boot_time`来计算进程的启动时间
``` python
def get_process_time(pid, boot_time):
    ps = {}
    ps_stat = open("/proc/%d/stat" % pid).read().strip()
    # Filename of the executable might contain spaces, so we throw it away
    ps_stat = ps_stat[ps_stat.rfind(')') + 2:].split()
    ps['utime'] = jiffies_to_seconds(ps_stat[11])
    ps['stime'] = jiffies_to_seconds(ps_stat[12])
    ps['cutime'] = jiffies_to_seconds(ps_stat[13])
    ps['cstime'] = jiffies_to_seconds(ps_stat[14])
    ps['start_time'] = boot_time + jiffies_to_seconds(ps_stat[19])
    ps['state'] = {'R' : _('Running'),
                   'S' : _('Sleeping'),
                   'D' : _('Uninterruptible'),
                   'Z' : _('Zombie'),
                   'T' : _('Traced/Stopped')
                   }.get(ps_stat[0], _('Unknown'))
```
通过rpmdb库里的`searchFiles`函数获取打开文件对应的包, 进而获取安装时间,即`installtime`

进程属于哪个systemd service的方法是 获取该pid的cgroup, 如果有`name=systemd`则说明它是一个服务, 然后已`/`为分隔符后的最后一个字段就是对应的service  
``` bash
$ cat /proc/3656/cgroup
11:blkio:/
10:cpuset:/
9:net_prio,net_cls:/
8:perf_event:/
7:hugetlb:/
6:freezer:/
5:memory:/
4:devices:/
3:pids:/
2:cpuacct,cpu:/
1:name=systemd:/system.slice/sshd.service
```

* 检查是否重启OS才能使相应更新后的软件包生效. 当然OS能正常运行.只是不重启无法使用新的功能或者特性.  
原理是检查升级的包是否在如下列表里  

```
 'kernel', 'glibc', 'linux-firmware', 'systemd', 'udev',
 `openssl-libs', 'gnutls', 'dbus'
```

``` bash
# needs-restarting -r
Core libraries or services have been updated:
  systemd -> 219-62.el7_6.6

Reboot is required to ensure that your system benefits from these updates.
More information:
https://access.redhat.com/solutions/27943
```

如下命令打印哪些服务需要重启  

``` bash
# needs-restarting -s
network.service
```

# 回退

使用`yum history`查询要回退事务的ID, 比如`213`. 然后运行`yum history undo 213`  
先查询指定的事务里的包状态信息, 然后反方向生成事务, 再次执行. 比如之前是更新, 那么新事务就是卸载新包,安装旧包  


# 其他

查询本地软件包来自哪个repo  

``` bash
# find-repos-of-install kernel
Loaded plugins: fastestmirror
kernel-3.10.0-123.el7.x86_64 from repo anaconda
kernel-3.10.0-957.21.2.el7.x86_64 from repo updates
```

使用`yum repolist -v`查询repo详情


# 参考
How to use yum history to roll back an update in Red Hat Enterprise Linux 6 , 7  
https://access.redhat.com/solutions/64069  
How to use yum to downgrade or rollback some package updates  
https://access.redhat.com/solutions/29617





