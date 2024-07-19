---
title: "Linux /etc/shadow 文件学习笔记"
author: "Peter Wang"
tags: ["linux", "shadow", "crypt"]
date: 2017-10-11T22:11:23+08:00
draft: false
---

Linux系统下，创建的用户信息如ID，家目录，默认shell保存在/etc/passwd下，该文件每行的第二位（以冒号分隔）表示密码。但真正的密码其实被加密后放在/etc/shadow里，/etc/passwd里只显示为x。本文主要介绍shadow文件各字段含义和相关的密码生命周期配置。

<!--more-->
本文内使用的Linux环境是centos7.3, 操作时间是2017年10月12号  

# 字段介绍
/etc/shadow每行和/etc/passwd一一对应，命令`pwconv`根据/etc/passwd生成。每行由9个字段（以冒号分隔）组成，如下是每个字段的含义：
## 1. 登录名: 
如 root， 通过它，唯一匹配/etc/passwd中的一行
## 2. 加密后的密码： 
通常的格式为: $X$ZZZZZZ  
X为数字，表示不同的加密算法，具体如下：

| ID            | Method   |
| :------------ |:---------|
| 1             | MD5      |
| 2a            | Blowfish |
| 5             | SHA-256  |
| 6             | SHA-512  |

第二个星号后面的ZZZZ为加密后的密文, 具体是通过glibc里的crypt函数来实现加密。文章最后会提供一段程序，通过盐值来加密明文。可以通过`man 3 crypt`了解函数使用方法

如果该字段 是 ! 或者 *， 表示该用户无法用密码登录系统.但可以通过其他方式登录。  
如果该字段以感叹号!开头，其余是通常的格式，则系统认为密码被锁， ssh登录时即使输入正确的密码，也会拒绝登录.  `usermod -L username` 就是使用该原理。`usermod  -U username` 功能是解锁

## 3. 密码最后修改时间：
通过`chage -d XX user`可以设置该字段  
值为从1970 1月1号至改密码时的天数。  
0表示用户需要在下次登录时修改密码  
空值表示关闭密码有效期功能，即密码永远有效  
如下是设置为0时的系统行为  
```
[root@linux /root]# grep test /etc/shadow
test:$6$IFqUZWcW$lEDn9cLw:17450:0:99999:7:::
[root@linux /root]# chage -d 0 test
[root@linux /root]# grep test /etc/shadow
test:$6$IFqUZWcW$lEDn9cLw:0:0:99999:7:::

$ ssh test@XX.XX.XX.XX
test@XX.XX.XX.XX's password:
You are required to change your password immediately (root enforced)
Last login: Wed Oct 11 23:09:07 2017 from XX.XX.XX.XX
WARNING: Your password has expired.
You must change your password now and login again!
Changing password for user test.
Changing password for test.
(current) UNIX password:
New password:
Retype new password:
passwd: all authentication tokens updated successfully.
Connection to XX.XX.XX.XX closed.
$
然后用新密码就可以登录了， 这个可以用于管理员强制普通用户修改密码
```

## 4. 最小时间间隔：
通过`chage -m XXX user`可以设置该字段  
两次修改口令之间所需的最小天数。  
空或者0表示没有限制  

## 5. 最大时间间隔：
通过`chage -M XXX user`可以设置该字段  
两次修改口令之间所需的最大天数。一旦超过，意味着密码过期.   
空表示没有限制.  

如果该值小于最小时间间隔，则用户无法修改密码,如下演示其行为:
```
[root@linux /root]# grep test /etc/shadow
test:$6$xxFzM1X0$GzIbWsFIqhhcJ:17450:5:4:7:::
[root@linux /root]#

[test@linux ~]$ passwd
Changing password for user test.
Changing password for test.
(current) UNIX password:
You must wait longer to change your password
passwd: Authentication token manipulation error
```
## 6. 警告天数：
通过`chage -W XXX user`可以设置该字段  
在密码过期前（即 密码最后修改时间 + 最大时间间隔），提前多少天通知用户. 此时仍可以正常登陆，只是多了一行提示  
空或者0表示无警告.  
如下演示告警信息:  
```
[root@linux /root]# grep test /etc/shadow
test:$6$xxFzM1X0$GzIbWsFIqhh:17450:0:6:7:::
[root@linux /root]#
$ ssh test@XX.XX.XX.XX
test@XX.XX.XX.XX's password:
Warning: your password will expire in 6 days
Last login: Wed Oct 11 23:36:04 2017 from XX.XX.XX.XX
[test@linux ~]$
```

## 7. 非活动周期:
通过`chage -I XXX user`可以设置该字段  
表示密码过期后，多少天内用户仍可以正常登陆，但要求立即修改密码。 一旦超过该天数，系统会拒绝用户登陆  
空值或者0表示没有非活动期，一旦密码过期直接拒绝登陆  

如下演示进入非活动期
```
[root@linux /root]# chage -l test
Last password change					: Oct 01, 2017
Password expires					: Oct 02, 2017
Password inactive					: Nov 01, 2017
Account expires						: never
Minimum number of days between password change		: 0
Maximum number of days between password change		: 1
Number of days of warning before password expires	: 7
[root@linux /root]# grep test /etc/shadow
test:$6$xxFzM1X0$GzIbWsFIqhhcJ:17440:0:1:7:30::
$ ssh test@XX.XX.XX.XX
test@XX.XX.XX.XX's password:
You are required to change your password immediately (password aged)
Last login: Wed Oct 11 23:51:05 2017 from XX.XX.XX.XX
WARNING: Your password has expired.
You must change your password now and login again!
Changing password for user test.
Changing password for test.
(current) UNIX password:
New password:
Retype new password:
passwd: all authentication tokens updated successfully.
Connection to XX.XX.XX.XX closed.
```

如下演示超过非活动期:
```
[root@linux /root]# chage -l test
Last password change					: Oct 01, 2017
Password expires					: Oct 02, 2017
Password inactive					: Oct 02, 2017
Account expires						: never
Minimum number of days between password change		: 0
Maximum number of days between password change		: 1
Number of days of warning before password expires	: 7
[root@linux /root]# grep test /etc/shadow
test:$6$wODB1.oE$39TBytc.5y0OkKn:17440:0:1:7:0::
$ ssh test@10.211.55.9
test@10.211.55.9's password:
Your account has expired; please contact your system administrator
Connection closed by 10.211.55.9
```

## 8. 用户过期时间：
通过`chage -E XXX user`可以设置该字段  
用户过期时间，值表示为自19701月1号起的天数.  
密码过期后，用户只是无法使用密码登陆，还可以用其他方式。 一旦用户过期，任何方式都无法用该用户登陆  
空值表示永远不会过期  
0值不建议使用。解释取决于程序本身  


## 9. 其他为保留字段，为将来扩展功能用

## 自己写代码实现加密(C 和 Python实现)
``` c
#include <crypt.h>
#include <stdio.h>

int main(int argc, char *argv[])
{
    if(argc!=3)
        return -1;
    char *buf = crypt((const char *)argv[1], (const char *)argv[2]);
    printf("salt: %s, crypt: %s\n", argv[2], buf);
    return 0;
}
```
```
#gcc -g a.c -lcrypt  
#grep root /etc/shadow  
root:$6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.:17450:0:99999:7:::  
#./a.out abc \$6\$DEgVEU0T  
salt: $6$DEgVEU0T, crypt: $6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.  
```

Python 2.7 自带crypt模块，它是C库 crypt的binding， 实现更简单。代码如下：
```
[root@abc ~]# python
Python 2.7.5 (default, Nov  6 2016, 00:28:07)
[GCC 4.8.5 20150623 (Red Hat 4.8.5-11)] on linux2
Type "help", "copyright", "credits" or "license" for more information.
>>> import crypt
>>> crypt.crypt("abc", "$6$DEgVEU0T")
'$6$DEgVEU0T$mwlTGb/nTtvpIJcoIy2t9xNMgv0.IT34WLvQ7VmbWJP9rU8Ysp9JyJ8I8PxEleGPWoirdbk4VKbhtCg6P.sm1.'
```

## 密码相关一些配置

/etc/login.defs 用来存放一些与创建用户和密码相关的配置信息  
当使用useradd创建新用户时，系统会读取该文件，然后写入/etc/shadows.  
和密码相关的只要是 PASS_MAX_DAYS，PASS_MIN_DAYS，PASS_MIN_LEN，PASS_WARN_AGE，ENCRYPT_METHOD 这几个参数  
UMASK用来定义默认的新建文件权限  
```
[root@linux /root]# grep ^[^#] /etc/login.defs
MAIL_DIR	/var/spool/mail
PASS_MAX_DAYS	99999
PASS_MIN_DAYS	0
PASS_MIN_LEN	5
PASS_WARN_AGE	7
UID_MIN                  1000
UID_MAX                 60000
SYS_UID_MIN               201
SYS_UID_MAX               999
GID_MIN                  1000
GID_MAX                 60000
SYS_GID_MIN               201
SYS_GID_MAX               999
CREATE_HOME	yes
UMASK           077
USERGROUPS_ENAB yes
ENCRYPT_METHOD SHA512
```

> 参考：  
> man 8 pwconv    
> man 5 shadow  
> man 3 crypt  