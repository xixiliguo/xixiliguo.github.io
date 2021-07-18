---
title: "Linux: Trap"
date: 2021-03-20T21:45:56+08:00
draft: false
---

记录一些关于内核处理异常,trap等的机制

<!--more-->
# 内核关于segment fault的打印
``` c
#include <stdio.h>
int main(int argc, char **argv) {
   int *p = 0x0;
   return printf("%d\n", *p);
}
```
上述代码中p为空指针, 访问它会触发segment fault, 系统日志会打印如下:
```
[Sat Mar 20 17:12:52 2021] a.out[40342]: segfault at 0 ip 00000000004005b1 sp 00007ffc5b1be400 error 4 in a.out[400000+1000]
```
对应x86的处理代码:
``` c
	printk("%s%s[%d]: segfault at %lx ip %px sp %px error %lx",
		loglvl, tsk->comm, task_pid_nr(tsk), address,
		(void *)regs->ip, (void *)regs->sp, error_code);
```
at 要具体要访问的内存地址  
ip 当前的执行指令的地址. 即寄存器`rip`的值  
sp 栈地址  
error page fault触发后生成的, 具体对应x86下面的含义可用以下代码解析.   
``` go
package main

import "fmt"

/*
 * x86 Page fault error code bits:
 *
 *   bit 0 ==	 0: no page found	1: protection fault
 *   bit 1 ==	 0: read access		1: write access
 *   bit 2 ==	 0: kernel-mode access	1: user-mode access
 *   bit 3 ==				1: use of reserved bit detected
 *   bit 4 ==				1: fault was an instruction fetch
 *   bit 5 ==				1: protection keys block access
 */

var errorDesc [][]string = [][]string{
	{"no page found", "protection fault"},
	{"read access", "write access"},
	{"kernel-mode access", "user-mode access"},
	{"", "use of reserved bit detected"},
	{"", "use of reserved bit detected"},
	{"", "protection keys block access"},
}

func main() {
	errorCode := 14
	for i := 0; i < 6; i++ {
		desc := errorDesc[i][errorCode>>i&1]
		if desc != "" {
			fmt.Println(desc)
		}
	}

}
```
in 后面跟执行指令当前位于哪个文件(可能是主程序文件,也可能是动态库)和该文件在内存中加载的地址  

参考:  
https://stackoverflow.com/questions/2549214/interpreting-segfault-messages  