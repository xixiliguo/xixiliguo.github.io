---
title: "Golang os/exec 实现"
author: "Peter Wang"
tags: ["os/exec"]
date: 2019-06-02T23:22:44+08:00
draft: false

---

os/exec 实现了golang调用shell或者其他OS中已存在的命令的方法. 本文主要是阅读内部实现后的一些总结. 

<!--more-->

# 基本使用
一. 如果要运行`ls -rlt`,代码如下:
``` go
package main

import (
	"fmt"
	"log"
	"os/exec"
)

func main() {

	cmd := exec.Command("ls", "-rlt")
	stdoutStderr, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s\n", stdoutStderr)
}
```
如果要运行`ls -rlt /root/*.go`, 使用`cmd := exec.Command("ls", "-rlt", "/root/*.go")`是错误的.  
因为底层是直接使用系统调用`execve`的.它并不会向Shell那样解析通配符. 变通方案为golang执行bash命令, 如:
``` go
package main

import (
	"fmt"
	"log"
	"os/exec"
)

func main() {

	cmd := exec.Command("bash", "-c","ls -rlt /root/*.go")
	stdoutStderr, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s\n", stdoutStderr)
}
```

二. 新进程默认继承父进程的环境变量, 要单独指定, 可以使用将类型为`[]string`的值赋给`cmd.Env`.  其行为不是增加, 是覆盖父进程的环境变量.  
三. 新进程的标准输入,标准输出,标准错误是可以指定随意配置的, 可以是文件, 也可以是`bytes.Buffer`这种满足`io.reader`或者`io.writer`的数据结构  
四. 默认新进程只有0,1,2三个文件描述符, 如果新进程想继承其他已打开的文件, 可以将它放入`cmd.ExtraFiles`. 该字段的英文解释如下:  
``` go
// ExtraFiles specifies additional open files to be inherited by the
// new process. It does not include standard input, standard output, or
// standard error. If non-nil, entry i becomes file descriptor 3+i.
//
```
这里有例外, 如果golang程序时从其他进程拉起的, 那么父进程本身可能从父父进程继承了一些没有标记为close-exec的文件, 这个在`execve`时是无法close的.子进程仍然会继承. 
# 源码分析
一. os/exec是高阶库,大概的调用关系如下:
```
                                                                 
                         +----------------+                      
                         | (*Cmd).Start() |                      
                         +----------------+                      
                                 |                               
                                 v                               
  +-------------------------------------------------------------+
  | os.StartProcess(name string, argv []string, attr *ProcAttr) |
  +-------------------------------------------------------------+
                                 |                               
                                 v                               
          +-------------------------------------------+          
          | syscall.StartProcess(name, argv, sysattr) |          
          +-------------------------------------------+          
```
二. (*Cmd).Start()主要处理如何与创建后的通信. 比如如何将一个文件内容作为子进程的标准输入, 如何获取子进程的标准输出.  具体创建进程在`os.StartProcess`里实现    
如下是处理子进程标准输入的具体代码注释.  

``` go
// 该函数返回子进程标准输入对应的文件信息. 在fork/exec后子进程里面将其对应的文件描述符设置为0
func (c *Cmd) stdin() (f *os.File, err error) {
    // 如果没有定义的标准输入来源, 则默认是/dev/null
	if c.Stdin == nil {
		f, err = os.Open(os.DevNull)
		if err != nil {
			return
		}
		c.closeAfterStart = append(c.closeAfterStart, f)
		return
	}

    // 如果定义子进程的标准输入为父进程已打开的文件, 则直接返回
	if f, ok := c.Stdin.(*os.File); ok {
		return f, nil
	}

    // 如果是其他的,比如实现了io.Reader的一段字符串, 则通过pipe从父进程传入子进程
    // 创建pipe, 成功execve后,在父进程里关闭读. 从父进程写, 从子进程读.
    // 一旦父进程获取子进程的结果, 即子进程运行结束, 在父进程里关闭写.
	pr, pw, err := os.Pipe()
	if err != nil {
		return
	}

	// 读端对父进程没有用,一旦子进程创建出来继承后, 父进程关闭它
	c.closeAfterStart = append(c.closeAfterStart, pr)
	// 父进程要等子进程运行结束后,才能将写端关闭, 因为子进程不存在了,不需要读了
    c.closeAfterWait = append(c.closeAfterWait, pw)
    
    // 通过goroutine将c.Stdin的数据写入到pipe的写端
	c.goroutine = append(c.goroutine, func() error {
		_, err := io.Copy(pw, c.Stdin)
		if skip := skipStdinCopyError; skip != nil && skip(err) {
			err = nil
		}
		if err1 := pw.Close(); err == nil {
			err = err1
		}
		return err
	})
	return pr, nil
}
```
三. golang里使用`os.OpenFile`打开的文件默认是`close-on-exec"  
除非它被指定为子进程的标准输入,标准输出或者标准错误输出, 否则在子进程里会被close掉.    

`file_unix.go`里是打开文件的逻辑:  

``` go
// openFileNolog is the Unix implementation of OpenFile.
// Changes here should be reflected in openFdAt, if relevant.
func openFileNolog(name string, flag int, perm FileMode) (*File, error) {
	setSticky := false
	if !supportsCreateWithStickyBit && flag&O_CREATE != 0 && perm&ModeSticky != 0 {
		if _, err := Stat(name); IsNotExist(err) {
			setSticky = true
		}
	}

	var r int
	for {
		var e error
		r, e = syscall.Open(name, flag|syscall.O_CLOEXEC, syscallMode(perm))
		if e == nil {
			break
		}

```
如果要让子进程继承指定的文件, 需要使用`ExtraFiles`字段

``` go
func main() {
	a, _ := os.Create("abc")
	cmd := exec.Command("ls", "-rlt", "/proc/self/fd")
	cmd.ExtraFiles = append(cmd.ExtraFiles, a)
	stdoutStderr, err := cmd.CombinedOutput()
	if err != nil {
		log.Fatal(err)
	}
	fmt.Printf("%s\n", stdoutStderr)
}
```
关于文件描述符(the processes' local file descriptor table)和系统级的文件打开表(OS' open file table)的关系, 可参见文章 https://www.cnblogs.com/Orgliny/articles/5699479.html   
如果两个文件描述符指向同一个文件打开项, 则共享打开的标志, 偏移量. (close-exec 是进程级文件描述符里的标志)  
每次`open`都会创建一个新的文件打开项, 所以同一个进程打开同一个文件两次, 那么文件打开项是不一样的. 不共享偏移量等信息  

四. 当父进程内存特别大的时候, fork/exec的性能非常差, golang使用clone系统调优并大幅优化性能. 主要思路是创建的子进程和父进程初始时共用堆栈,fork则是复制一份堆栈. 具体代码如下:  
``` go
	locked = true
	switch {
	case runtime.GOARCH == "amd64" && sys.Cloneflags&CLONE_NEWUSER == 0:
		r1, err1 = rawVforkSyscall(SYS_CLONE, uintptr(SIGCHLD|CLONE_VFORK|CLONE_VM)|sys.Cloneflags)
	case runtime.GOARCH == "s390x":
		r1, _, err1 = RawSyscall6(SYS_CLONE, 0, uintptr(SIGCHLD)|sys.Cloneflags, 0, 0, 0, 0)
	default:
		r1, _, err1 = RawSyscall6(SYS_CLONE, uintptr(SIGCHLD)|sys.Cloneflags, 0, 0, 0, 0, 0)
	}
```
网上有很多关于讨论该性能的文章:  
https://zhuanlan.zhihu.com/p/47940999    
https://about.gitlab.com/2018/01/23/how-a-fix-in-go-19-sped-up-our-gitaly-service-by-30x/  
https://github.com/golang/go/issues/5838  
如果是C语言, 可以使用`posix_spawn`代替`fork/exec`.  
`posix_spawn_file_actions_adddup2`,`posix_spawn_file_actions_addclose`,`posix_spawn_file_actions_addopen`等可以操作继承的文件描述符, 达到改变子进程0,1,2等目的.  详细的参考代码可见 https://github.com/rtomayko/posix-spawn/blob/master/ext/posix-spawn.c    
``` c
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include <unistd.h>
#include <spawn.h>
#include <sys/wait.h>
#include <time.h>

extern char **environ;

void run_cmd_posix_spawn(char *argv[])
{
    pid_t pid;
    int status;

    status = posix_spawn(&pid, argv[0], NULL, NULL, argv, environ);
    if (status == 0)
    {
        // printf("Child pid: %i\n", pid);
        if (waitpid(pid, &status, 0) != -1)
        {
            // printf("Child exited with status %i\n", status);
        }
        else
        {
            perror("waitpid");
        }
    }
    else
    {
        printf("posix_spawn: %s\n", strerror(status));
    }
}

void run_cmd_fork_exec(char *argv[])
{
    pid_t pid;
    int status;

    pid = fork();
    if (pid == 0)
    {
        // printf("Child process pid = %u\n", getpid());
        execv(argv[0], argv);
        exit(0);
    }
    else
    {
        // printf("Parent process\n");

        if (waitpid(pid, &status, 0) > 0)
        {

            if (WIFEXITED(status) && !WEXITSTATUS(status))
            {
                // printf("program execution successfull\n");
            }
            else if (WIFEXITED(status) && WEXITSTATUS(status))
            {
                if (WEXITSTATUS(status) == 127)
                {

                    // execv failed
                    printf("execv failed\n");
                }
                else
                    printf("program terminated normally,"
                           " but returned a non-zero status\n");
            }
            else
                printf("program didn't terminate normally\n");
        }
        else
        {
            // waitpid() failed
            printf("waitpid() failed\n");
        }
    }
}

int main(int argc, char *argv[])
{
    int i;
    printf("Run command: ");
    for (i = 1; argv[i] != NULL; i++)
    {
        printf("%s ", argv[i]);
    }
    printf("\n");

    clock_t start, finish;
    double duration;

    int loop = 10000;

    start = clock();

    for (i = 0; i < loop; i++)
    {
        run_cmd_posix_spawn(&argv[1]);
    }
    finish = clock();
    duration = (double)(finish - start) / CLOCKS_PER_SEC / loop;
    printf("posix_spawn:  %d times:  %f seconds per one count\n", loop, duration);

    start = clock();

    for (i = 0; i < loop; i++)
    {
        run_cmd_fork_exec(&argv[1]);
    }
    finish = clock();
    duration = (double)(finish - start) / CLOCKS_PER_SEC / loop;
    printf("fork/exec:  %d times:  %f seconds per one count\n", loop, duration);
}
```
五. 父进程使用pipe来探测在创建子进程execve时是否有异常.  
在 syscall/exec_unix.go中.  
如果execve成功,则该pipe因close-on-exec在子进程里自动关闭. 父进程从pipe读到的长度为0  
如果有异常, 则将错误写入pipd的写端, 父进程读到长度非0的信息, 然后进行下一步处理  
``` go
	// Acquire the fork lock so that no other threads
	// create new fds that are not yet close-on-exec
	// before we fork.
	ForkLock.Lock()

	// Allocate child status pipe close on exec.
	if err = forkExecPipe(p[:]); err != nil {
		goto error
	}

	// Kick off child.
	pid, err1 = forkAndExecInChild(argv0p, argvp, envvp, chroot, dir, attr, sys, p[1])
	if err1 != 0 {
		err = Errno(err1)
		goto error
	}
	ForkLock.Unlock()

	// Read child error status from pipe.
	Close(p[1])
	n, err = readlen(p[0], (*byte)(unsafe.Pointer(&err1)), int(unsafe.Sizeof(err1)))
	Close(p[0])
	if err != nil || n != 0 {
		if n == int(unsafe.Sizeof(err1)) {
			err = Errno(err1)
		}
		if err == nil {
			err = EPIPE
		}

		// Child failed; wait for it to exit, to make sure
		// the zombies don't accumulate.
		_, err1 := Wait4(pid, &wstatus, 0, nil)
		for err1 == EINTR {
			_, err1 = Wait4(pid, &wstatus, 0, nil)
		}
		return 0, err
	}

	// Read got EOF, so pipe closed on exec, so exec succeeded.
	return pid, nil
```
六. 当子进程运行完后, 使用系统调用`wait4`回收资源, 可获取`exit code`,`信号`和`rusage`使用量等信息.  
七. 有超时机制, 如下例子是子进程在5分钟没有运行时也返回.  不会长时间阻塞进程.  
``` go
package main

import (
	"context"
	"os/exec"
	"time"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	if err := exec.CommandContext(ctx, "sleep", "5").Run(); err != nil {
		// This will fail after 100 milliseconds. The 5 second sleep
		// will be interrupted.
	}
}

```

具体是使用`context`库实现超时机制.  一旦时间达到,就给子进程发送`kill`信号,强制中止它.
``` go
	if c.ctx != nil {
		c.waitDone = make(chan struct{})
		go func() {
			select {
			case <-c.ctx.Done():
				c.Process.Kill()
			case <-c.waitDone:
			}
		}()
	}
```
八. 假设调用一个脚本A, A有会调用B. 如果此时golang程序超时kill掉A, 那么B就变为pid为1的进程的子进程.  
有时这并不是我们所希望的.因为真正导致长时间没返回结果的可能是B进程.所以更希望将A和B同时杀掉.  默认golang的`exec.CommandContext`无法实现.  
具体需要在创建子进程时使用`setpgid`,将进程组ID设置为进程ID. 子子进程会继承这个进程组ID, 最后超时kill时指定进程组ID, 会将该进程组内的所有进程都kill掉.  对应golang的代码为:   
``` go
func main() {

	cmd := exec.Command("/root/sleep.sh")
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}

	start := time.Now()
	time.AfterFunc(30*time.Second, func() {
		syscall.Kill(-cmd.Process.Pid, syscall.SIGKILL)
	})

	err := cmd.Run()
	fmt.Printf("pid=%d duration=%s err=%s\n", cmd.Process.Pid, time.Since(start), err)

}
```
参考:  
https://medium.com/@felixge/killing-a-child-process-and-all-of-its-children-in-go-54079af94773  