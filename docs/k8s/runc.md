---
title: "runc 容器运行时学习笔记"
author: "Peter Wang"
tags: ["docker", "runc"]
date: 2019-11-03T10:31:44+08:00
draft: false

---

runc实现了CRI接口, 也就是容器运行时. 利用linux的cgroup, namespace使进程运行在一个虚拟的隔离环境, 本文记录了源码阅读后的心得.  

<!--more-->

# 基本使用
一. `runc --systemd-cgroup --debug  run 123  --bundle /mycontainer/`就可以启动一个容器.

--bundle 指定启动容器所需的config.json和 rootfs的位置, 类似下面的结构.  
rootfs是一个文件夹, 里面是容器进程运行所有的所有依赖文件. 一个小型的os的rootfs  
``` bash
# ls -rlt
total 8
drwxr-xr-x 12 root root 4096 Sep  4 20:31 rootfs
-rw-r--r--  1 root root 2685 Sep  7 22:38 config.json
```

config.json规范可参见 https://github.com/opencontainers/runtime-spec



二. `runc run`相当于先`create`, 后再执行`start`. 但`create`创建的容器是只能在后台运行.   
三. 创建容器后,会创建相应的临时信息到`/run/runc/[container id]`. 已表示容器已创建, 并生成一个`exec.fifo`管道文件.  外部命令也能从该文件夹下的state.json文件获取容器的一些基本信息


# 源码分析
一. `runc run xxx`大致过程如下:
```
                                                                                                               
                                                                                                               
+-----------------------------------------------+             +-----------------------------------------------+
|                                               |             |                                               |
| startContainer(context, spec, CT_ACT_RUN, nil)| --------->  |   createContainer(context, id, spec)          |
|                                               |             |                                               |
+-----------------------------------------------+             +-----------------------------------------------+
                                                                                      |                        
                                                                                      |                        
                                                                                      |                        
                                                                                      |                        
                                                                                      |                        
                                                                                      |                        
                                                                                      v                        
                                                                                                               
                                                              +-----------------------------------------------+
                                                              |                                               |
                                                              |            &runner.Run(config)                |
                                                              |                                               |
                                                              +-----------------------------------------------+
                                                                                                               
                                                                                                                
```

`run`的入口在`run.go`, `setupSpec`先校验config.json并转换为go下面的结构里,  在`startContainer`里创建容器用启动  
`startContainer->createContainer`通过工厂函数创建一个容器对应的数据结构体, 然后通过 runner启动它  

二. factory.go 和 factory_linux.go 是具体的工厂接口和 linux下的实现. 主要是生产出一个容器对象. 做了很多校验工作, 比如用户指定的容器id是否符合规范, config.json里的值是否合法, 是否规范  

三. 默认cgroup下指定了cgroup, 比如 abc, 则为 /abc  
如果没有指定cgroupsPath, 路径为 容器id  
使用systemd-cgroup, 如果在config.json里指定了cgroup子系统path , 格式必须为 `slice:prefix:name`, 否则会报错.   
例如"cgroupsPath":   "system.slice:testrunc:123"   
没有指定cgrouppatch, 则默认的格式为	system.slice:runc:容器id  

四. 创建容器的过程是runc准备好相关信息后, 创建一个子进程, 命令为`runc init`, 具体的逻辑在`init.go`里. 但在golang代码运行前, `package nsenter`里的cgo代码会先运行起来. 因为`init.go`里导入了它. 它比所有的go 代码提前运行, 可以保证在没有go进入多线程的情况下执行切换命名空间的作用. 

`init.go`里有 `_ "github.com/opencontainers/runc/libcontainer/nsenter"` 这句

`nsenter.go`里的 init语句可使包被引用时自动执行 nsexec().  
``` go
// +build linux,!gccgo

package nsenter

/*
#cgo CFLAGS: -Wall
extern void nsexec();
void __attribute__((constructor)) init(void) {
	nsexec();
}
*/
import "C"
```

具体创建的过程如下图所示:  
![runc运行容器的流程图](/img/runc.png)


无论创建还是容器, 都先将容器start, 执行``(c *linuxContainer) Start()` , 创建子进程后将状态信息写入 `/run/runc/[container id]/state.json`  
`runc create`只是创建容器, 它并不会运行 `(c *linuxContainer) exec()`. 所以容器进程一直阻塞在 `write to exec.fifo`, 无法执行execve, 也就无法真正运行容器的init进程.   
`run start`入口在`start.go`, 就是执行`container.Exec()`, 读exec.fifo的信息, 返回的字节数大于0, 那就是收到了`0x00`, 则容器进程开始execve,正式运行起来.  如果返回的字节数<=0, 则说明容器已经处于运行状态. 
``` go
		switch status {
		case libcontainer.Created:
			return container.Exec()
		case libcontainer.Stopped:
			return errors.New("cannot start a container that has stopped")
		case libcontainer.Running:
			return errors.New("cannot start an already running container")
		default:
			return fmt.Errorf("cannot start a container in the %s state\n", status)
        }
```
四. 容器进程默认的0,1,2 标准IO设置与config.json的配置相关

假如config.json中`Terminal: True`:  
命令行没有 -d, runc自建socket对, 将其中一个作为容器的consolesocket传入子进程  
命令行指定 -d --console-socket xxx, 直接将指定的consolescoetk传入子进程  
容器进程`open /dev/ptmx`, slaveId给0,1,2, masterID通过consolesocket发出, 
非detach模式下runc接受到masterID, 然后0收到后写入masterID, masterID收到的写入1,2   
detach模式下需要额外的进程在运行"runc start"前在指定的socekt监听, 这样才能和容器通信, 参考`recvtty.go`的实现  

假如config.json中`Terminal: False`:  
命令行没有 -d, runc创建三个pipe, 自己从标准输入读到的信息, 会写入到管道一段, 这样容器进程的标准输入就能从管道读到, 其他类推   
命令行指定 -d  直接将runc的三个IO直接让容器ID继承  

`utils_linux.go`里的`setupIO`具体实现了runc对consoleSocket或者其他父进程里的IO设置  
`(l *linuxStandardInit) Init() `里的`setupConsole` 配置终端  

五. `runc exec`是在已有的容器里执行一个命令  
和运行容器时启动的默认命令时区别在于传入`runner`的字段`init`.  exec时该字段为`false`   
导致生成`newSetnsProcess`, 而不是 `newInitProcess`  
在容器的进程里是`func (l *linuxSetnsInit) Init()`, 而不是`func (l *linuxStandardInit) Init()`  
linuxSetnsInit的init的过程步骤很少, 因为在创建容器是许多工作已经做完了. 只是简单的配置下IO,然后直接`execve`到其要指定的命令  

六. `runc ps [container id]`查询该容器下所有进程  
通过`/var/run/[container id]/state.json`获取容器信息,然后通过其cgroup的路径找到所有的进程  
再从`ps -ef`里获取这些进程的信息  

七. `runc pause xxx`和`runc resume`用于冻结和恢复容器进程的执行.  是使用cgroup提供的freezer能力实现的  
