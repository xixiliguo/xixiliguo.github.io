---
title: "一些代码片段"
author: "Peter Wang"
tags: ["代码", "片段"]
date: 2020-09-30T00:09:04+08:00
draft: false
---

记录自己日常写的一些代码片段
<!--more-->

### 使用golang实现类似ping获取网络时延
``` go
package main

import (
	"log"
	"net"
	"os"
	"syscall"
	"time"
	"unsafe"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

func main() {

	conn, err := net.DialIP("ip4:icmp", nil, &net.IPAddr{IP: net.ParseIP("114.114.114.114")})
	if err != nil {
		log.Fatalf("net DialIP: %s", err)
	}
	rawconn, err := conn.SyscallConn()
	if err != nil {
		log.Fatalf("get raw: %s", err)
	}
	rawconn.Control(func(fd uintptr) {
		syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_TIMESTAMP, 1)

	})
	wm := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID: os.Getpid() & 0xffff, Seq: 1,
			Data: []byte("aaaaaaaaaaaaaaaaaaaaaaaaaaaa"),
		},
	}
	wb, err := wm.Marshal(nil)
	if err != nil {
		log.Fatalf("generate icmp request: %s", err)
	}

	beforetime := time.Now()
	log.Printf("send %+v\n", wm)
	_, err = conn.Write(wb)
	if err != nil {
		log.Fatalf("send icmp request: %s", err)
	}

	rb := make([]byte, 1500)
	oob := make([]byte, 1500)
	n, oobn, _, addr, err := conn.ReadMsgIP(rb, oob)

	if err != nil {
		log.Fatal(err)
	}

	header, err := ipv4.ParseHeader(rb[:n])
	if err != nil {
		log.Fatalf("decode ip header of icmp response: %s", err)
	}

	rm, err := icmp.ParseMessage(1, rb[header.Len:n])

	if err != nil {
		log.Fatalf("parse icmp messages: %s", err)
	}
	switch rm.Type {
	case ipv4.ICMPTypeEchoReply:
		resp := rm.Body.(*icmp.Echo)
		if resp.ID != os.Getpid()&0xffff || resp.Seq != 1 {
			log.Fatalf("receiv icmp response for antoher process")
		}
		cmsgs, err := syscall.ParseSocketControlMessage(oob[:oobn])
		if err != nil {
			log.Fatalf("parse cmsg: %s", err)
		}
		m := cmsgs[0]
		aftertime := time.Now()
		if m.Header.Level == syscall.SOL_SOCKET && m.Header.Type == syscall.SCM_TIMESTAMP {
			var recvtime syscall.Timeval
			recvtime = *(*syscall.Timeval)(unsafe.Pointer(&m.Data[0]))
			aftertime = time.Unix(recvtime.Unix())
			log.Printf("using so_timestamp")
		}
		log.Printf("after %dms, got msg %+v from %v", aftertime.Sub(beforetime).Milliseconds(), rm, addr)

	default:
		log.Printf("got %+v from %v; want echo reply", rm, addr)
	}

}
```
运行结果如下:
``` bash
$ go run main.go
2020/09/30 00:12:07 send {Type:echo Code:0 Checksum:0 Body:0xc000094870}
2020/09/30 00:12:07 using so_timestamp
2020/09/30 00:12:07 after 30ms, got msg &{Type:echo reply Code:0 Checksum:38592 Body:0xc00006c060} from 114.114.114.114
```

### 使用golang打印系统调用时errorno的含义
``` go
package main

import (
	"fmt"
	"syscall"
)

func main() {
	for i := 1; i < 133; i++ {
		errno := syscall.Errno(i)
		fmt.Printf("Errno %d 0x%x: %s\n", i, i, errno.Error())
	}
}
```
运行结果如下:
``` bash
$ go run main.go
Errno 1 0x1: operation not permitted
Errno 2 0x2: no such file or directory
Errno 3 0x3: no such process
Errno 4 0x4: interrupted system call
Errno 5 0x5: input/output error
Errno 6 0x6: no such device or address
Errno 7 0x7: argument list too long
Errno 8 0x8: exec format error
Errno 9 0x9: bad file descriptor
Errno 10 0xa: no child processes
Errno 11 0xb: resource temporarily unavailable
......
```

### 分析两个关于超出最大文件数的错误逻辑

ENFILE是指超过了系统级最大的文件句柄数.  `sysctl fs.file-max`  
EMFILE是指超过了该进程指定的最大文件数. `cat /proc/[pid]/limits`里的`Max open files`    
``` c
#define	ENFILE		23	/* File table overflow */
#define	EMFILE		24	/* Too many open files */
```
`Too many open files` 演示代码:
``` c
#include <stdio.h>
#include <sys/resource.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <sys/types.h>
#include <sys/stat.h>
#include <fcntl.h>

int main() {

    struct rlimit old_lim, lim, new_lim;

    // Get old limits
    if( getrlimit(RLIMIT_NOFILE, &old_lim) == 0)
        printf("Old limits -> soft limit= %ld \t"
          " hard limit= %ld \n", old_lim.rlim_cur,
                               old_lim.rlim_max);
    else
        fprintf(stderr, "%s\n", strerror(errno));

    // Set new value
    lim.rlim_cur = 3;
    lim.rlim_max = 3;


    // Set limits
    if(setrlimit(RLIMIT_NOFILE, &lim) == -1)
        fprintf(stderr, "%s\n", strerror(errno));

    // Get new limits
    if( getrlimit(RLIMIT_NOFILE, &new_lim) == 0)
        printf("New limits -> soft limit= %ld \t"
          " hard limit= %ld \n", new_lim.rlim_cur,
                                new_lim.rlim_max);
    else
        fprintf(stderr, "%s\n", strerror(errno));

    // Try to open a new file
    if(open("foo.txt", O_WRONLY | O_CREAT, 0) == -1)
        fprintf(stderr, "errno %d: %s\n", errno, strerror(errno));
    else
            printf("Opened successfully\n");

    return 0;
}
```

运行结果如下, 说明当进程打开的文件数超过`ulimit -a`里设置的值或者`RLIMIT_NOFILE`, 两者等价. 返回`EMFILE` 24号错误   
``` bash
$ gcc -g testopenfiles-process.c -o testopenfiles-process && ./testopenfiles-process
Old limits -> soft limit= 1048576 	 hard limit= 1048576
New limits -> soft limit= 3 	 hard limit= 3
errno 24: Too many open files
```

`File table overflow` 或者`Too many open files in system`演示代码:
``` c
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main() {

  int i;
  for (i = 0; i < 200000; i++) {
    char name[256];
    sprintf(name, "foo%d.txt", i);
    if (open(name, O_WRONLY | O_CREAT, 0) == -1)
      fprintf(stderr, "errno %d: %s\n", errno, strerror(errno));
    else
      printf("Opened successfully\n");
  }

  return 0;
}
```

运行结果如下, 说明当进程打开的文件数系统的最大文件数时. 返回`ENFILE` 23号错误   
``` bash
$ gcc -g testopenfiles-system.c -o testopenfiles-system && ./testopenfiles-system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
errno 23: Too many open files in system
```

dmesg里可以同时也打印类似`VFS: file-max limit 135375 reached`这样的日志. 

### 分析EAGAIN的产生场景
``` c
#define	EAGAIN		11	/* Try again */
```
在`fork`等系统调用时返回`EAGAIN Resource temporarily unavailable`是因为进程/线程数超限了, 要检查两种情况  
1. 当该进程/线程对应的用户的所有进程数超过上限, `ulimit -a`里的`NOFILE`  
2. `sysctl kernel.pid_max` OS系统级的最大进程数  
有一篇详细的案例可参考: https://access.redhat.com/solutions/1434943  
 `man 2 fork`里的解释如下:
```
EAGAIN fork() cannot allocate sufficient memory to copy the parent's page tables and allocate a task structure for the child.
EAGAIN It  was  not  possible to create a new process because the caller's RLIMIT_NPROC resource limit was encountered.  To exceed this limit, the process must have either the CAP_SYS_ADMIN or the CAP_SYS_RESOURCE capability.   
```
非root用户执行如下代码:
``` c
#include <errno.h>
#include <fcntl.h>
#include <stdio.h>
#include <string.h>
#include <sys/resource.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>

int main() {
  struct rlimit old_lim, lim, new_lim;

  // Get old limits
  if (getrlimit(RLIMIT_NPROC, &old_lim) == 0)
    printf(
        "Old limits -> soft limit= %ld \t"
        " hard limit= %ld \n",
        old_lim.rlim_cur, old_lim.rlim_max);
  else
    fprintf(stderr, "%s\n", strerror(errno));

  // Set new value
  lim.rlim_cur = 5;
  lim.rlim_max = 5;

  // Set limits
  if (setrlimit(RLIMIT_NPROC, &lim) == -1)
    fprintf(stderr, "%s\n", strerror(errno));

  // Get new limits
  if (getrlimit(RLIMIT_NPROC, &new_lim) == 0)
    printf(
        "New limits -> soft limit= %ld "
        "\t hard limit= %ld \n",
        new_lim.rlim_cur, new_lim.rlim_max);
  else
    fprintf(stderr, "%s\n", strerror(errno));

  const int targetFork = 10;
  pid_t forkResult;
  int i;
  for (i = 0; i < targetFork; i++) {
    forkResult = fork();
    if (forkResult == -1) {
      printf("errno %d %s\n", errno, strerror(errno));
    } else if (forkResult == 0) {
      printf("Child pid: %d\n", getpid());
      break;
    } else {
      printf("Parent pid: %d trigger fork %d times %d\n", getpid() , i + 1);
    }
  }
  return 0;
}
```
结果为:
``` bash
$ ./a.out
Old limits -> soft limit= 4096 	 hard limit= 5370
New limits -> soft limit= 5 	 hard limit= 5
Parent pid: 26665 trigger fork 1 times 1068333019
Child pid: 26666
Parent pid: 26665 trigger fork 2 times 1068329250
Parent pid: 26665 trigger fork 3 times 1068329250
Child pid: 26667
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
errno 11 Resource temporarily unavailable
Child pid: 26668
```

如果是`root`用户执行, 则不会有报错, 是因为root默认有`CAP_SYS_ADMIN`或者`CAP_SYS_RESOURCE`权限


### 实现类似hexdump打印格式的代码

``` c
#include <stdio.h>

extern char **environ;

void hexDump(char *desc, void *addr, int len) {
  int i;
  unsigned char buffLine[17];
  unsigned char *pc = (unsigned char *)addr;

  if (desc != NULL) {
    printf("%s:\n", desc);
  }

  for (i = 0; i < len; i++) {
    if ((i % 16) == 0) {
      if (i != 0) printf("  %s\n", buffLine);
      // Prints the ADDRESS
      printf("  %08x ", i);
    }

    // Prints the HEXCODES that represent each chars.
    printf("%02x", pc[i]);
    if ((i % 2) == 1) printf(" ");

    if ((pc[i] < 0x20) || (pc[i] > 0x7e)) {
      buffLine[i % 16] = '.';
    } else {
      buffLine[i % 16] = pc[i];
    }

    buffLine[(i % 16) + 1] = '\0';  // Clears the next array buffLine
  }

  while ((i % 16) != 0) {
    if ((i % 2) == 1) {
      printf("   ");
    } else {
      printf("  ");
    }
    i++;
  }

  printf("  %s\n", buffLine);
}

int main(int argc, char **argv) {
  char *end;
  int i;

  printf("argc = %p %d\n", &argc, argc);
  printf("argv = %p\n", argv);
  for (i = 0; i < argc; i++) {
    printf("argv[%d] = %p %s\n", i, argv[i], argv[i]);
  }

  printf("environ = %p\n", environ);
  for (i = 0; environ[i] != NULL; i++) {
    printf("environ[%d] = %p %s\n", i, environ[i], environ[i]);
  }
  printf("\n\n");
  for (end = environ[i - 1]; *end != 0x00; end++) {
  }
  hexDump("begin from argv[0]", argv[0], end - argv[0] + 1);

  return 0;
}
```