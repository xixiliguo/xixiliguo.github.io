---
title: "使用Bandersnatch搭建私有Pypi源"
---

# 使用Bandersnatch搭建私有Pypi源
经常使用python的公司,考虑到pypi.python.org不稳定,都会自己搭建私有的Pypi源.这里简单介绍下方法.



现在流行使用Bandersnatch作为同步工具, 如下演示在centos7.4环境下通过

## 安装virtualenv
virtualenv 可以为一个应用创建一套“隔离”的Python运行环境。所有依赖包在自己独立的环境,不会影响其他python程序,更不会放到系统默认的site-packages里

``` bash
$ yum install python-virtualenv
```

### 创建独立Python环境

``` bash
$ virtualenv Bandersnatch
New python executable in Bandersnatch/bin/python
Please make sure you remove any previous custom paths from your /root/.pydistutils.cfg file.
Installing Setuptools...........................................................done.
Installing Pip..................................................................done.
$
```

### 激活独立Python环境

``` bash
[root@abc ~]$ source Bandersnatch/bin/activate
(Bandersnatch)[root@abc ~]#
```
当指示符前显示 `(Bandersnatch)` 字样, 意味着所有python的操作,都只限于独立环境, 系统Python环境不受任何影响

### 安装Bandersnatch
最新版的`Bandersnatch 2.0`支持python3, 但目前的环境是python2.7.5, 所以需要下载其他版本. 这里取`1.11`版

### 获取安装包
``` bash
(Bandersnatch)[root@abc ~]$ wget https://bitbucket.org/pypa/bandersnatch/get/1.11.tar.gz
--2018-01-02 22:39:22--  https://bitbucket.org/pypa/bandersnatch/get/1.11.tar.gz
Resolving bitbucket.org (bitbucket.org)... 104.192.143.3, 104.192.143.2, 104.192.143.1, ...
Connecting to bitbucket.org (bitbucket.org)|104.192.143.3|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 25988 (25K) [application/x-tar-gz]
Saving to: ‘1.11.tar.gz.1’

100%[=============================================>] 25,988      72.9KB/s   in 0.3s

2018-01-02 22:39:24 (72.9 KB/s) - ‘1.11.tar.gz.1’ saved [25988/25988]
```

### 解压缩tar包

``` bash
(Bandersnatch)[root@abc ~]$ tar -xzvf 1.11.tar.gz
pypa-bandersnatch-76b72f3ebd6c/.hg_archival.txt
pypa-bandersnatch-76b72f3ebd6c/.coveragerc
pypa-bandersnatch-76b72f3ebd6c/.hgignore
pypa-bandersnatch-76b72f3ebd6c/.hgtags
pypa-bandersnatch-76b72f3ebd6c/CHANGES.txt
pypa-bandersnatch-76b72f3ebd6c/DEVELOPMENT
pypa-bandersnatch-76b72f3ebd6c/LICENSE
pypa-bandersnatch-76b72f3ebd6c/MANIFEST.in
pypa-bandersnatch-76b72f3ebd6c/README
pypa-bandersnatch-76b72f3ebd6c/buildout.cfg
pypa-bandersnatch-76b72f3ebd6c/pytest.ini
pypa-bandersnatch-76b72f3ebd6c/requirements.txt
pypa-bandersnatch-76b72f3ebd6c/setup.py
pypa-bandersnatch-76b72f3ebd6c/src/bandersnatch/__init__.py
`````````````````````````(此处省略若干字)
```
### 使用pip安装

``` bash
(Bandersnatch)[root@abc ~]$ pip install -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt
Downloading/unpacking coverage==3.7.1 (from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt (line 2))
  Downloading coverage-3.7.1.tar.gz (284kB): 284kB downloaded
  Running setup.py egg_info for package coverage

    warning: no previously-included files matching '*.pyc' found anywhere in distribution
Downloading/unpacking pyparsing==2.1.3 (from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt (line 3))
  Downloading pyparsing-2.1.3.tar.gz (1.1MB): 1.1MB downloaded
  Running setup.py egg_info for package pyparsing

Downloading/unpacking py==1.4.26 (from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt (line 4))
  Downloading py-1.4.26.tar.gz (190kB): 190kB downloaded
  Running setup.py egg_info for package py
(此处省略若干字)
      Installing bandersnatch script to /root/Bandersnatch/bin
  Could not find .egg-info directory in install record for bandersnatch==1.11 (from -r pypa-bandersnatch-76b72f3ebd6c/requirements.txt (line 22))
Successfully installed coverage pyparsing py pyflakes pep8 pytest cov-core execnet python-dateutil six setuptools mock packaging pytest-capturelog pytest-codecheckers pytest-cov pytest-timeout pytest-cache requests xmlrpc2 bandersnatch
Cleaning up...
(Bandersnatch)[root@abc ~]$
```

## 配置Bandersnatch并运行

### 首次运行创建配置文件
```
(Bandersnatch)[root@abc ~]$ bandersnatch mirror
2018-01-02 22:43:37,985 WARNING: Config file '/etc/bandersnatch.conf' missing, creating default config.
2018-01-02 22:43:37,985 WARNING: Please review the config file, then run 'bandersnatch' again.
(Bandersnatch)[root@abc ~]$
```
这一步,会创建默认的配置文件/etc/bandersnatch.conf.

### 修改配置文件
`vi /etc/bandersnatch.conf`  
修改directory为存放文件的目标文件夹. 其他选项通常不需要修改.

``` ini
[mirror]
; The directory where the mirror data will be stored.
directory = /srv/pypi
```

## 启动同步

``` bash
(Bandersnatch)[root@abc ~]$ bandersnatch  mirror
2018-01-02 22:45:44,376 INFO: bandersnatch/1.11 (CPython 2.7.5-final0, Linux 3.10.0-693.2.2.el7.x86_64 x86_64)
2018-01-02 22:45:44,376 INFO: Status file missing. Starting over.
2018-01-02 22:45:44,376 INFO: Syncing with https://pypi.python.org.
2018-01-02 22:45:44,376 INFO: Current mirror serial: 0
2018-01-02 22:45:44,376 INFO: Syncing all packages.
(此处省略若干字)
```

# 其他说明

因为使用了`virtualenv`, 将程序移植也很方便, 使用`tar -czvf Bandersnatch.tar.gz Bandersnatch `将文件夹打包,在其他主机(需要有python2)的相同目录下解包即可直接运行

如果要系统定期自动同步, 则创建`/etc/cron.d/bandersnatch`文件, 将下面内容写入

``` bash
*/2 * * * * root bandersnatch mirror |& logger -t bandersnatch[mirror]
```
该定时任务会将运行日志写入到系统日志里. `|&` 代表 前者的标准输出和标准错误都作为后者的标准输入

本文主要参考了 https://pypi.python.org/pypi/bandersnatch
