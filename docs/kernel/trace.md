
介绍kernel的跟踪技术原理

## kprobe实现
使用以下命令创建一个kprobe事件,来跟踪`tcp_v4_rcv`  
``` bash
echo 'p:myprobe tcp_v4_rcv' >> /sys/kernel/tracing/kprobe_events
echo 1 >/sys/kernel/tracing/events/kprobes/myprobe/enable
```
查看trace文件, 就能看到跟踪信息
``` bash
[root@localhost tracing]# cat trace
# tracer: nop
#
# entries-in-buffer/entries-written: 325/325   #P:8
#
#                                _-------=> irqs-off/BH-disabled
#                               / _------=> need-resched
#                              | / _-----=> need-resched-lazy
#                              || / _----=> hardirq/softirq
#                              ||| / _---=> preempt-depth
#                              |||| / _--=> preempt-lazy-depth
#                              ||||| / _-=> migrate-disable
#                              |||||| /     delay
#           TASK-PID     CPU#  |||||||  TIMESTAMP  FUNCTION
#              | |         |   |||||||      |         |
          <idle>-0       [007] ...s2.. 52559.052473: myprobe: (tcp_v4_rcv+0x0/0xf90)
          <idle>-0       [007] ...s2.. 52559.416002: myprobe: (tcp_v4_rcv+0x0/0xf90)
            sshd-1092    [004] ...s2.. 52559.416657: myprobe: (tcp_v4_rcv+0x0/0xf90)
            sshd-1092    [004] ...s2.. 52559.416711: myprobe: (tcp_v4_rcv+0x0/0xf90)
          <idle>-0       [007] ...s2.. 52559.420874: myprobe: (tcp_v4_rcv+0x0/0xf90)
            sshd-1092    [004] ...s2.. 52559.421210: myprobe: (tcp_v4_rcv+0x0/0xf90)
            sshd-1092    [004] ...s2.. 52559.421260: myprobe: (tcp_v4_rcv+0x0/0xf90)
```
运行crash,反汇编`tcp_v4_rcv`, 可以看到第一个指令从NOP改写成CALL指令. 通常在编译内核时每个函数的开头都
预留一个NOP指令, 平时运行不影响.但一旦被跟踪, 内核就会重写这个指令,指向其他函数来运行跟踪函数.
``` bash
crash> dis -l tcp_v4_rcv | head -5
/usr/src/debug/kernel-5.14.0-505.el9/linux-5.14.0-505.el9.x86_64/net/ipv4/tcp_ipv4.c: 1916
0xffffffff865237d0 <tcp_v4_rcv>:        call   0xffffffffc0aa4000
0xffffffff865237d5 <tcp_v4_rcv+5>:      push   %r15
0xffffffff865237d7 <tcp_v4_rcv+7>:      push   %r14
0xffffffff865237d9 <tcp_v4_rcv+9>:      push   %r13
```
`0xffffffffc0aa4000` 从地址看是分配到vmalloc的一段内存. 是函数`create_trampoline`创建的. 字面意思
是创建一个弹跳函数.
``` bash
[root@localhost ~]# grep ^0xffffffffc0aa4000 /proc/vmallocinfo
0xffffffffc0aa4000-0xffffffffc0aa6000    8192 create_trampoline+0x7a/0x260 pages=1 vmalloc N0=1
```
继续解析call的目标地址的汇编指令,通过push指令当前的状态和寄存器都保存下来, 顺序跟`struct pt_regs`保持一致,
然后使用`lea    (%rsp),%rcx`将struct pt_regs的结构体指针作为第四个参数传给`kprobe_ftrace_handler`, 
这样跟踪程序就能访问当时的寄存器信息
``` bash
crash> dis 0xffffffffc0aa4000 64
dis: WARNING: ffffffffc0aa4000: no associated kernel symbol found
   0xffffffffc0aa4000:  pushf
   0xffffffffc0aa4001:  sub    $0xa8,%rsp
   0xffffffffc0aa4008:  mov    %rax,0x50(%rsp)
   0xffffffffc0aa400d:  mov    %rcx,0x58(%rsp)
   0xffffffffc0aa4012:  mov    %rdx,0x60(%rsp)
   0xffffffffc0aa4017:  mov    %rsi,0x68(%rsp)
   0xffffffffc0aa401c:  mov    %rdi,0x70(%rsp)
   0xffffffffc0aa4021:  mov    %r8,0x48(%rsp)
   0xffffffffc0aa4026:  mov    %r9,0x40(%rsp)
   0xffffffffc0aa402b:  movq   $0x0,0x78(%rsp)
   0xffffffffc0aa4034:  mov    %rbp,%rdx
   0xffffffffc0aa4037:  mov    %rdx,0x20(%rsp)
   0xffffffffc0aa403c:  mov    0xb8(%rsp),%rsi
   0xffffffffc0aa4044:  mov    0xb0(%rsp),%rdi
   0xffffffffc0aa404c:  mov    %rdi,0x80(%rsp)
   0xffffffffc0aa4054:  sub    $0x5,%rdi
   0xffffffffc0aa4058:  nopw   %cs:0x0(%rax,%rax,1)
   0xffffffffc0aa4062:  mov    0xf7(%rip),%rdx        # 0xffffffffc0aa4160
   0xffffffffc0aa4069:  mov    %r15,(%rsp)
   0xffffffffc0aa406d:  mov    %r14,0x8(%rsp)
   0xffffffffc0aa4072:  mov    %r13,0x10(%rsp)
   0xffffffffc0aa4077:  mov    %r12,0x18(%rsp)
   0xffffffffc0aa407c:  mov    %r11,0x30(%rsp)
   0xffffffffc0aa4081:  mov    %r10,0x38(%rsp)
   0xffffffffc0aa4086:  mov    %rbx,0x28(%rsp)
   0xffffffffc0aa408b:  mov    0xa8(%rsp),%rcx
   0xffffffffc0aa4093:  mov    %rcx,0x90(%rsp)
   0xffffffffc0aa409b:  mov    $0x18,%rcx
   0xffffffffc0aa40a2:  mov    %rcx,0xa0(%rsp)
   0xffffffffc0aa40aa:  mov    $0x10,%rcx
   0xffffffffc0aa40b1:  mov    %rcx,0x88(%rsp)
   0xffffffffc0aa40b9:  lea    0xb8(%rsp),%rcx
   0xffffffffc0aa40c1:  mov    %rcx,0x98(%rsp)
   0xffffffffc0aa40c9:  lea    (%rsp),%rcx
   0xffffffffc0aa40cd:  nopw   %cs:0x0(%rax,%rax,1)
   0xffffffffc0aa40d7:  call   0xffffffff85a7ea10 <kprobe_ftrace_handler>
```
假设ctx 指向`struct pt_regs`, 那么ctx->ip 存放被跟踪函数的地址(x86的情况下要减1),
ctx->sp代表一个栈上的指针, 指向调用函数的地址(即被跟踪函数返回后要运行的下一个地址). sp有个例外情况,当
函数同时被kprobe, kretprobe跟踪, 那么ctx->sp代表的指针指向的是kretprobe的回调函数.  
`kprobe_ftrace_handler` 最终会调用pre_handler, 来执行具体的跟踪功能.  
运行完`kprobe_ftrace_handler`后,通过pop来恢复寄存器信息.  


```
crash> kprobe.addr,pre_handler 0xffff8f2419779618
  addr = 0xffffffff8ed237d0 <tcp_v4_rcv> "\350+(\302\061AWAVAUE1\355ATUH\211\375SH\203\354@eH\213\004%(",
  pre_handler = 0xffffffff8e495ab0 <kprobe_dispatcher>,
```

## kretprobe实现
使用以下命令创建一个kretprobe事件,来跟踪`tcp_v4_rcv`  
``` bash
echo 'r:myretprobe tcp_v4_rcv' >> /sys/kernel/tracing/kprobe_events
echo 1 >/sys/kernel/tracing/events/kprobes/myretprobe/enable
```
查看trace文件, 就能看到跟踪信息
``` bash
[root@localhost tracing]# cat trace
[root@localhost tracing]# cat trace
# tracer: nop
#
# entries-in-buffer/entries-written: 21/21   #P:8
#
#                                _-------=> irqs-off/BH-disabled
#                               / _------=> need-resched
#                              | / _-----=> need-resched-lazy
#                              || / _----=> hardirq/softirq
#                              ||| / _---=> preempt-depth
#                              |||| / _--=> preempt-lazy-depth
#                              ||||| / _-=> migrate-disable
#                              |||||| /     delay
#           TASK-PID     CPU#  |||||||  TIMESTAMP  FUNCTION
#              | |         |   |||||||      |         |
          <idle>-0       [007] ...s2..   211.528028: myretprobe: (ip_protocol_deliver_rcu+0x32/0x2e0 <- tcp_v4_rcv)
          <idle>-0       [007] ...s2..   211.721273: myretprobe: (ip_protocol_deliver_rcu+0x32/0x2e0 <- tcp_v4_rcv)
          <idle>-0       [007] ...s2..   211.763827: myretprobe: (ip_protocol_deliver_rcu+0x32/0x2e0 <- tcp_v4_rcv)
```
运行crash,反汇编`tcp_v4_rcv`, 跟krpobe一样, 也会call 0xffffffffc0aa4000
``` bash
crash> dis -l tcp_v4_rcv | head -5
/usr/src/debug/kernel-5.14.0-505.el9/linux-5.14.0-505.el9.x86_64/net/ipv4/tcp_ipv4.c: 1916
0xffffffff865237d0 <tcp_v4_rcv>:        call   0xffffffffc0aa4000
0xffffffff865237d5 <tcp_v4_rcv+5>:      push   %r15
0xffffffff865237d7 <tcp_v4_rcv+7>:      push   %r14
0xffffffff865237d9 <tcp_v4_rcv+9>:      push   %r13
```
但是运行的handle却不一样, pre_handler 指向的是`pre_handler_kretprobe`, 作用是当函数刚开始运行时, 将返回地址修改为
`arch_rethook_trampoline`,这样就完成对了函数返回的跟踪, 在钩子函数里执行自定义内容,然后再次修改返回地址为正确的值.
``` bash
crash> kretprobe.kp.addr,kp.pre_handler,handler 0xffff8f2419779618
  kp.addr = 0xffffffff8ed237d0 <tcp_v4_rcv> "\350+(\302\061AWAVAUE1\355ATUH\211\375SH\203\354@eH\213\004%(",
  kp.pre_handler = 0xffffffff8e42d920 <pre_handler_kretprobe>,
  handler = 0xffffffff8e495d90 <kretprobe_dispatcher>,
```
ebpf里如果跟踪kretprobe的话,ctx指向`struct pt_regs`, ctx->ip是钩子函数的地址. 并不是被跟踪的函数. ctx->sp 等于存放返回地址
的栈地址 + 1  

如果同时对一个函数进行kprobe, kretprobe跟踪, pre_handler 变为 `aggr_pre_handler`, 它会执行kprobe的动作,同时
会修改返回地址, 供后续的kretprobe的执行.
``` bash
crash> kretprobe.kp.addr,kp.pre_handler,handler 0xffff8f24194dfb40
  kp.addr = 0xffffffff8ed237d0 <tcp_v4_rcv> "\350+(\302\061AWAVAUE1\355ATUH\211\375SH\203\354@eH\213\004%(",
  kp.pre_handler = 0xffffffff8e42d680 <aggr_pre_handler>,
  handler = 0xffff8f24194dfbc0,
```