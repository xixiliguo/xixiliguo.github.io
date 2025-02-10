---
title: "系统调用与进程调度"
date: 2021-09-20T21:45:56+08:00
draft: false
---

记录一些关于内核系统调用和进程调度相关的知识点, 以5.14内核为例

## 64位下系统调用约定
c语言的函数调用过程中:  
RDI, RSI, RDX, RCX, R8, R9  分别代表第一个,二个,三个... 参数, RAX代表返回值  
RBX, RSP, RBP, and R12–R15  是调用者保存寄存器, 意思是调用者先保存原先值,在子函数返回时需要恢复,以确保该寄存器的值没变  

Linux系统调用时稍微有一点不同, **第三个参数不是放到RCX, 而是R10.  RCX用于保存切换时用户态时的RIP**

下面是golang在linux amd64的系统调用汇编

``` go
// func Syscall6(trap, a1, a2, a3, a4, a5, a6 uintptr) (r1, r2, err uintptr)
TEXT ·Syscall6(SB),NOSPLIT,$0-80
	CALL	runtime·entersyscall(SB)
	MOVQ	a1+8(FP), DI
	MOVQ	a2+16(FP), SI
	MOVQ	a3+24(FP), DX
	MOVQ	a4+32(FP), R10  // 存放第三个参数
	MOVQ	a5+40(FP), R8
	MOVQ	a6+48(FP), R9
	MOVQ	trap+0(FP), AX	// syscall entry
	SYSCALL
	CMPQ	AX, $0xfffffffffffff001    // 判断AX 是否小于 MAX_ERRNO:-4095 , 是则成功 
	JLS	ok6
	MOVQ	$-1, r1+56(FP)
	MOVQ	$0, r2+64(FP)
	NEGQ	AX
	MOVQ	AX, err+72(FP)             // 错误时, 则负值变正值, 返回具体的错误码
	CALL	runtime·exitsyscall(SB)
	RET
ok6:
	MOVQ	AX, r1+56(FP)
	MOVQ	DX, r2+64(FP)
	MOVQ	$0, err+72(FP)
	CALL	runtime·exitsyscall(SB)
	RET
```

系统调用返回前, 会执行`callq`, 将有符号的4字节扩展为8字节. 比如0x80000000 变为 ffffffff80000000, 0x40000000仍是40000000  
https://stackoverflow.com/questions/6555094/what-does-cltq-do-in-assembly  
所有系统调用的返回错误值范围为[-4095, -1], 所以可以无符号判断 RAX  小于 0xfffffffffffff001, 则为正常返回  
``` c
/*
 * Kernel pointers have redundant information, so we can use a
 * scheme where we can return either an error code or a normal
 * pointer with the same return value.
 *
 * This should be a per-architecture thing, to allow different
 * error and pointer decisions.
 */
#define MAX_ERRNO	4095

#ifndef __ASSEMBLY__

#define IS_ERR_VALUE(x) unlikely((unsigned long)(void *)(x) >= (unsigned long)-MAX_ERRNO)
```
``arch/x86/include/asm/syscall_wrapper.h``有一段注释,表示每个系统调用函数(比如__x64_sys_revc)
都取`regs->r10`赋值到`rcx`后作为第三个参数调用子函数  
``` c
 * <__x64_sys_recv>:		<-- syscall with 4 parameters
 *	callq	<__fentry__>
 *
 *	mov	0x70(%rdi),%rdi	<-- decode regs->di
 *	mov	0x68(%rdi),%rsi	<-- decode regs->si
 *	mov	0x60(%rdi),%rdx	<-- decode regs->dx
 *	mov	0x38(%rdi),%rcx	<-- decode regs->r10
 *
 *	xor	%r9d,%r9d	<-- clear %r9
 *	xor	%r8d,%r8d	<-- clear %r8
 *
 *	callq	__sys_recvfrom	<-- do the actual work in __sys_recvfrom()
 *				    which takes 6 arguments
 *
 *	cltq			<-- extend return value to 64-bit
 *	retq			<-- return
 *
 ```

64位下不是通过INT 0x80, 而是通过syscall指令触发系统调用, 对应的函数为`entry_SYSCALL_64`, 在这个函数里, 用户态的很多原始信息,比如rip,rsp都保存在`struct pt_regs`里, 然后 entry_SYSCALL_64 --> do_syscall_64  
通过给`MSR_LSTAR`寄存器写入entry_SYSCALL_64地址, 那么执行syscall指令时就是切换到汇编entry_SYSCALL_64
``` c
	wrmsr(MSR_STAR, 0, (__USER32_CS << 16) | __KERNEL_CS);
	wrmsrl(MSR_LSTAR, (unsigned long)entry_SYSCALL_64);
```
将用户态时的rsp保存到per cpu变量cpu_tss_rw里面, 切换cpu为内核模式, 然后依次将寄存器里的值push, 填充pt_regs结构体. 保存所有用户态相关的信息  
从代码上看, 执行do_syscall_64前中断是关闭的, 在`syscall_enter_from_user_mode`里打开, 从`do_syscall_64`返回时又关闭了, 等执行了sysret后应该又打开了  
``` c
SYM_CODE_START(entry_SYSCALL_64)
	UNWIND_HINT_EMPTY

	swapgs
	/* tss.sp2 is scratch space. */
	movq	%rsp, PER_CPU_VAR(cpu_tss_rw + TSS_sp2)
	SWITCH_TO_KERNEL_CR3 scratch_reg=%rsp
	movq	PER_CPU_VAR(cpu_current_top_of_stack), %rsp

SYM_INNER_LABEL(entry_SYSCALL_64_safe_stack, SYM_L_GLOBAL)

	/* Construct struct pt_regs on stack */
	pushq	$__USER_DS				/* pt_regs->ss */
	pushq	PER_CPU_VAR(cpu_tss_rw + TSS_sp2)	/* pt_regs->sp */
	pushq	%r11					/* pt_regs->flags */
	pushq	$__USER_CS				/* pt_regs->cs */
	pushq	%rcx					/* pt_regs->ip */
SYM_INNER_LABEL(entry_SYSCALL_64_after_hwframe, SYM_L_GLOBAL)
	pushq	%rax					/* pt_regs->orig_ax */

	PUSH_AND_CLEAR_REGS rax=$-ENOSYS

	/* IRQs are off. */
	movq	%rsp, %rdi
	/* Sign extend the lower 32bit as syscall numbers are treated as int */
	movslq	%eax, %rsi
	call	do_syscall_64		/* returns with IRQs disabled */
```
``` c
__visible noinstr void do_syscall_64(struct pt_regs *regs, int nr)
{
	add_random_kstack_offset();
	nr = syscall_enter_from_user_mode(regs, nr);
	/* syscall_enter_from_user_mode里面会检查一些权限, 比如是否满足SECCOMP. 对系统调用的审计也在这里 
	 * 如果返回-1, 则不会执行下面的函数, 最终给用户态程序返回 -ENOSYS
	*/

	instrumentation_begin();

	if (!do_syscall_x64(regs, nr) && !do_syscall_x32(regs, nr) && nr != -1) {
		/* Invalid system call, but still a system call. */
		regs->ax = __x64_sys_ni_syscall(regs);
	}

	instrumentation_end();
	syscall_exit_to_user_mode(regs);
}
```
`PER_CPU_VAR(cpu_tss_rw + TSS_sp0)` 在cpu_init里已经初始化了, 定义为`trampoline stack`
`PER_CPU_VAR(cpu_tss_rw + TSS_sp2)` 在linux中没有确定性的用途, 用于临时存放`RSP`.
``` c
/*
 * cpu_init() initializes state that is per-CPU. Some data is already
 * initialized (naturally) in the bootstrap process, such as the GDT.  We
 * reload it nevertheless, this function acts as a 'CPU state barrier',
 * nothing should get across.
 */
void cpu_init(void)
{
	..........
	/*
	 * sp0 points to the entry trampoline stack regardless of what task
	 * is running.
	 */
	load_sp0((unsigned long)(cpu_entry_stack(cpu) + 1));
```

所有的系统调用的具体实现函数, 汇总到`sys_call_table`,同时`arch/x86/entry/syscalls/syscall_64.tbl` 里也可以直接查询系统调用号与具体实现函数名的对应关系
``` c
crash> whatis sys_call_table
const sys_call_ptr_t sys_call_table[];
crash> p sys_call_table[0]
$9 = (const sys_call_ptr_t) 0xffffffffb9b19c30
crash> sym 0xffffffffb9b19c30
ffffffffb9b19c30 (T) __x64_sys_read /usr/src/debug/kernel-4.18.0-305.3.1.el8_4/linux-4.18.0-305.3.1.el8.x86_64/fs/read_write.c: 586
crash>
```

`syscall_exit_to_user_mode  ->  __syscall_exit_to_user_mode_work --> exit_to_user_mode_prepare --> exit_to_user_mode_loop`, 在exit_to_user_mode_loop里有一些重要的事情要做.  
如果该进程被标记为需要调度,即需要让出cpu,让其他进程执行  
该进程收到信号需要处理, 也是在退出syscall返回用户态空间前执行的  

如下函数的反汇编 `mov    0x38(%rdi),%ecx` 可以看到确实是将陷入内核态前的R10(代表第三个参数)赋值给RCX, 满足后续C语言的调用规约
```
crash> dis -l __x64_sys_recv
/usr/src/debug/kernel-5.14.0-22.el9/linux-5.14.0-22.el9.x86_64/net/socket.c: 2111
0xffffffffa21f4400 <__x64_sys_recv>:    nopl   0x0(%rax,%rax,1) [FTRACE NOP]
/usr/src/debug/kernel-5.14.0-22.el9/linux-5.14.0-22.el9.x86_64/net/socket.c: 2114
0xffffffffa21f4405 <__x64_sys_recv+5>:  mov    0x60(%rdi),%rdx
0xffffffffa21f4409 <__x64_sys_recv+9>:  mov    0x68(%rdi),%rsi
0xffffffffa21f440d <__x64_sys_recv+13>: xor    %r9d,%r9d
0xffffffffa21f4410 <__x64_sys_recv+16>: xor    %r8d,%r8d
0xffffffffa21f4413 <__x64_sys_recv+19>: mov    0x38(%rdi),%ecx
0xffffffffa21f4416 <__x64_sys_recv+22>: mov    0x70(%rdi),%edi
0xffffffffa21f4419 <__x64_sys_recv+25>: call   0xffffffffa21f4210 <__sys_recvfrom>
/usr/src/debug/kernel-5.14.0-22.el9/linux-5.14.0-22.el9.x86_64/net/socket.c: 2111
0xffffffffa21f441e <__x64_sys_recv+30>: cltq
0xffffffffa21f4420 <__x64_sys_recv+32>: ret
crash> struct pt_regs -xo | grep 0x38
  [0x38] unsigned long r10;
crash>
```

`sysretq`指令从`RCX`获取到用户态的执行地址, 载入值到RIP, 即返回用户态  

从代码中搜索系统调用具体函数的技巧: 以open为例, 它有三个参数, 则通过`define3(open` 就能很快找到对应的实现

参考:  
http://abcdxyzk.github.io/blog/2012/11/23/assembly-args/  
https://en.wikipedia.org/wiki/X86_calling_conventions  
https://cloud.tencent.com/developer/article/1492374  
https://arthurchiao.art/blog/system-call-definitive-guide-zh/  


## task_struct部分字段的含义


``` c
struct task_struct {
u64        utime;//用户态消耗的CPU时间
u64        stime;//内核态消耗的CPU时间
unsigned long      nvcsw;//自愿(voluntary)上下文切换计数
unsigned long      nivcsw;//非自愿(involuntary)上下文切换计数
u64        start_time;//进程启动时间，不包含睡眠时间
u64        real_start_time;//进程启动时间，包含睡眠时间
}
```
utime, stime单位为ns, 两次时钟中断触发的时间间隔为`1/HZ`. 内核里面HZ一般是1000,(centos是1000, ubuntu是250), 在函数`account_process_tick`里每次更新utime,stime都是增加`TICK_NSEC` - steal-time`, TICK_NSEC为1000000, 
``` bash
[root@localhost ~]# grep CONFIG_HZ= /boot/config-5.14.0-22.el9.x86_64
CONFIG_HZ=1000
```

``` c

/* TICK_NSEC is the time between ticks in nsec assuming SHIFTED_HZ */
#define TICK_NSEC ((NSEC_PER_SEC+HZ/2)/HZ)

/*
 * Account a tick to a process and cpustat
 * @p: the process that the CPU time gets accounted to
 * @user_tick: is the tick from userspace
 * @rq: the pointer to rq
 *
 * Tick demultiplexing follows the order
 * - pending hardirq update
 * - pending softirq update
 * - user_time
 * - idle_time
 * - system time
 *   - check for guest_time
 *   - else account as system_time
 *
 * Check for hardirq is done both for system and user time as there is
 * no timer going off while we are on hardirq and hence we may never get an
 * opportunity to update it solely in system time.
 * p->stime and friends are only updated on system time and not on irq
 * softirq as those do not count in task exec_runtime any more.
 */
static void irqtime_account_process_tick(struct task_struct *p, int user_tick,
					 int ticks)
{
	u64 other, cputime = TICK_NSEC * ticks;

	/*
	 * When returning from idle, many ticks can get accounted at
	 * once, including some ticks of steal, irq, and softirq time.
	 * Subtract those ticks from the amount of time accounted to
	 * idle, or potentially user or system time. Due to rounding,
	 * other time can exceed ticks occasionally.
	 */
	other = account_other_time(ULONG_MAX);
	if (other >= cputime)
		return;

	cputime -= other;

	if (this_cpu_ksoftirqd() == p) {
		/*
		 * ksoftirqd time do not get accounted in cpu_softirq_time.
		 * So, we have to handle it separately here.
		 * Also, p->stime needs to be updated for ksoftirqd.
		 */
		account_system_index_time(p, cputime, CPUTIME_SOFTIRQ);
	} else if (user_tick) {
		account_user_time(p, cputime);
	} else if (p == this_rq()->idle) {
		account_idle_time(cputime);
	} else if (p->flags & PF_VCPU) { /* System time or guest time */
		account_guest_time(p, cputime);
	} else {
		account_system_index_time(p, cputime, CPUTIME_SYSTEM);
	}
}
```
大致的调用关系
```
     	irqtime_account_process_tick+1
        update_process_times+81
        tick_sched_handle+34
        tick_sched_timer+97
        __hrtimer_run_queues+298
        hrtimer_interrupt+272
        __sysvec_apic_timer_interrupt+92
        sysvec_apic_timer_interrupt+55
        asm_sysvec_apic_timer_interrupt+18
```
``` c
update_process_times
	irqtime_account_process_tick     /* 更新cpu信息 */
	scheduler_tick                   /* 更新调度相关的信息, 比如 vruntime */
```
start_time, real_start_time单位是ns, 指自系统启动以来到进程创建时流逝的时间, 在`copy_process`里赋值
```
	p->start_time = ktime_get_ns();
	p->real_start_time = ktime_get_boot_ns();
```
如下显示systemd进程时系统启动17ms后创建, 截止dump生成,以运行6小时多.
``` bash
crash> ps -t 1
PID: 1      TASK: ffff8fb0c6dc2f80  CPU: 0   COMMAND: "systemd"
    RUN TIME: 06:34:57
  START TIME: 17000000
       UTIME: 1072507605
       STIME: 1248244355

crash>
```
我们在`/proc/[pid]/stat`里看到的utime 和 stime单位是clock ticks, 内核里HZ每个版本可能不一样, 但为了保持用户态的一致性,暴露给用户态的USER_HZ却一直都是100. 通过`nsec_to_clock_t` 将task_struct->utime,stime转化为`ticks`. 在centos8 x86_64环境为`x/( NSEC_PER_SEC / USER_HZ)`
``` c
u64 nsec_to_clock_t(u64 x)
{
#if (NSEC_PER_SEC % USER_HZ) == 0
	return div_u64(x, NSEC_PER_SEC / USER_HZ);
#elif (USER_HZ % 512) == 0
	return div_u64(x * USER_HZ / 512, NSEC_PER_SEC / 512);
#else
	/*
         * max relative error 5.7e-8 (1.8s per year) for USER_HZ <= 1024,
         * overflow after 64.99 years.
         * exact for HZ=60, 72, 90, 120, 144, 180, 300, 600, 900, ...
         */
	return div_u64(x * 9, (9ull * NSEC_PER_SEC + (USER_HZ / 2)) / USER_HZ);
#endif
}
```
`/proc/[pid]/stat`的具体实现在`fs/proc/array.c`里的`do_task_stat`
``` c
	seq_put_decimal_ull(m, " ", nsec_to_clock_t(utime));
	seq_put_decimal_ull(m, " ", nsec_to_clock_t(stime));
```


`top`里显示cpu的hi和si在`irqtime_account_irq`计算, 该函数在irq_enter和irq_exit时运行. ksoftirq的处理时间不仅算在自己进程的stime上, 还会算到cpu的si上面


``` c
static inline void account_softirq_enter(struct task_struct *tsk)
{
	vtime_account_irq(tsk, SOFTIRQ_OFFSET);
	irqtime_account_irq(tsk, SOFTIRQ_OFFSET);      /*更新starttime, 但第二个参数不让计算差值*/
}

static inline void account_softirq_exit(struct task_struct *tsk)
{
	vtime_account_softirq(tsk);
	irqtime_account_irq(tsk, 0);                   /*更新starttime, 并将差值(now-starttime)统计进去*/
}

static inline void account_hardirq_enter(struct task_struct *tsk)
{
	vtime_account_irq(tsk, HARDIRQ_OFFSET);
	irqtime_account_irq(tsk, HARDIRQ_OFFSET);     /*更新starttime, 但第二个参数不让计算差值*/
}

static inline void account_hardirq_exit(struct task_struct *tsk)
{
	vtime_account_hardirq(tsk);
	irqtime_account_irq(tsk, 0);                  /*更新starttime, 并将差值(now-starttime)统计进去*/
}
```

通过task获取pt_regs的函数如下, 这里记录了进程进入内核态时, 保存的一些用户态信息.
``` c
#ifdef CONFIG_KASAN
#define KASAN_STACK_ORDER 1
#else
#define KASAN_STACK_ORDER 0
#endif

#define THREAD_SIZE_ORDER	(2 + KASAN_STACK_ORDER)
#define THREAD_SIZE  (PAGE_SIZE << THREAD_SIZE_ORDER)


#define task_pt_regs(task) \
({									\
	unsigned long __ptr = (unsigned long)task_stack_page(task);	\
	__ptr += THREAD_SIZE - TOP_OF_KERNEL_STACK_PADDING;		\
	((struct pt_regs *)__ptr) - 1;					\
})

#ifdef CONFIG_X86_32
# ifdef CONFIG_VM86
#  define TOP_OF_KERNEL_STACK_PADDING 16
# else
#  define TOP_OF_KERNEL_STACK_PADDING 8
# endif
#else
# define TOP_OF_KERNEL_STACK_PADDING 0
#endif


```
pid的类型为int,但pidmax默认值在kernel/pid.c里的`pid_idr_init`设置, 新分配的pid是上一次分配的pid加1, 直到pid_max, 然后循环使用已闲置的最小pid.
``` c
void __init pid_idr_init(void)
{
	/* Verify no one has done anything silly: */
	BUILD_BUG_ON(PID_MAX_LIMIT >= PIDNS_ADDING);

	/* bump default and minimum pid_max based on number of cpus */
	pid_max = min(pid_max_max, max_t(int, pid_max,
				PIDS_PER_CPU_DEFAULT * num_possible_cpus()));
	pid_max_min = max_t(int, pid_max_min,
				PIDS_PER_CPU_MIN * num_possible_cpus());
	pr_info("pid_max: default: %u minimum: %u\n", pid_max, pid_max_min);

	idr_init(&init_pid_ns.idr);

	init_pid_ns.pid_cachep = KMEM_CACHE(pid,
			SLAB_HWCACHE_ALIGN | SLAB_PANIC | SLAB_ACCOUNT);
}
```

如果要通过`sysctl -w kernel.pid_max=xxx`调节, 64位下最大值为4194304. 一般CONFIG_BASE_SMALL为N.
``` c
/*
 * A maximum of 4 million PIDs should be enough for a while.
 * [NOTE: PID/TIDs are limited to 2^29 ~= 500+ million, see futex.h.]
 */
#define PID_MAX_LIMIT (CONFIG_BASE_SMALL ? PAGE_SIZE * 8 : \
	(sizeof(long) > 4 ? 4 * 1024 * 1024 : PID_MAX_DEFAULT))
```


在`copy_process`里先判断是否超过ulimit里面的限制,  但root用户的进程不受这个限制
``` c
	if (is_ucounts_overlimit(task_ucounts(p), UCOUNT_RLIMIT_NPROC, rlimit(RLIMIT_NPROC))) {
		if (p->real_cred->user != INIT_USER &&
		    !capable(CAP_SYS_RESOURCE) && !capable(CAP_SYS_ADMIN))
			goto bad_fork_free;
	}
```
如果当前的线程数(其实就是task_struct的数量, 在linux进程和线程其实是都是task_struct), 超过/proc/sys/kernel/threads-max, 也会报错
``` c
	/*
	 * If multiple threads are within copy_process(), then this check
	 * triggers too late. This doesn't hurt, the check is only there
	 * to stop root fork bombs.
	 */
	retval = -EAGAIN;
	if (data_race(nr_threads >= max_threads))
		goto bad_fork_cleanup_count;
```
紧接着如果因超过pid_max, 且没闲置的pid, 则会导致创建进程失败.
``` c
	if (pid != &init_struct_pid) {
		pid = alloc_pid(p->nsproxy->pid_ns_for_children, args->set_tid,
				args->set_tid_size);
		if (IS_ERR(pid)) {
			retval = PTR_ERR(pid);
			goto bad_fork_cleanup_thread;
		}
	}
```
最后还会检查cgroup里的的pid_max限制
``` c
	/*
	 * Ensure that the cgroup subsystem policies allow the new process to be
	 * forked. It should be noted that the new process's css_set can be changed
	 * between here and cgroup_post_fork() if an organisation operation is in
	 * progress.
	 */
	retval = cgroup_can_fork(p, args);
	if (retval)
		goto bad_fork_put_pidfd;

```
日志里面有如下报错,就是因为这个原因  
cgroup: fork rejected by pids controller in /user.slice/user-0.slice/session-7.scope   

我们再来看经常遇到的超过文件句柄数相关的一些知识  
通过`ulimit -n`设置进程最大的打开文件数, 最大值为`1048576`, 它是受限于`sysctl fs.nr_open`
``` c
unsigned int sysctl_nr_open __read_mostly = 1024*1024;   //默认值
unsigned int sysctl_nr_open_min = BITS_PER_LONG;
/* our min() is unusable in constant expressions ;-/ */
#define __const_min(x, y) ((x) < (y) ? (x) : (y))
unsigned int sysctl_nr_open_max =
	__const_min(INT_MAX, ~(size_t)0/sizeof(void *)) & -BITS_PER_LONG;  //最大值
```
有两个跟文件句柄数的报错, `ENFILE`表示超过了OS整的系统限制, `EMFILE`表示超过了自身的`/proc/[pid]/limits`里面`Max open files`的限制
```
/usr/include/asm-generic/errno-base.h:#define   ENFILE          23      /* File table overflow */
/usr/include/asm-generic/errno-base.h:#define   EMFILE          24      /* Too many open files */
```
OS系统级所有打开的文件句柄最大数, 普通用户受限, 但root的进程不受限
``` shell
[root@localhost abc]# sysctl fs.file-nr
fs.file-nr = 1984       0       789985
[root@localhost abc]# sysctl fs.file-max
fs.file-max = 789985
[root@localhost abc]#
```
``` c
struct file *alloc_empty_file(int flags, const struct cred *cred)
{
	static long old_max;
	struct file *f;

	/*
	 * Privileged users can go above max_files
	 */
	if (get_nr_files() >= files_stat.max_files && !capable(CAP_SYS_ADMIN)) {
		/*
		 * percpu_counters are inaccurate.  Do an expensive check before
		 * we go and fail.
		 */
		if (percpu_counter_sum_positive(&nr_files) >= files_stat.max_files)
			goto over;
	}

	f = __alloc_file(flags, cred);
	if (!IS_ERR(f))
		percpu_counter_inc(&nr_files);

	return f;

over:
	/* Ran out of filps - report that */
	if (get_nr_files() > old_max) {
		pr_info("VFS: file-max limit %lu reached\n", get_max_files());
		old_max = get_nr_files();
	}
	return ERR_PTR(-ENFILE);
}
```

task_struct->stack 指向进程的内核栈, 在 dup_task_struct --> alloc_thread_stack_node 里面分配, 通常是通过vmalloc分配, 而不是slab系统
``` c
	/*
	 * Allocated stacks are cached and later reused by new threads,
	 * so memcg accounting is performed manually on assigning/releasing
	 * stacks to tasks. Drop __GFP_ACCOUNT.
	 */
	stack = __vmalloc_node_range(THREAD_SIZE, THREAD_ALIGN,
				     VMALLOC_START, VMALLOC_END,
				     THREADINFO_GFP & ~__GFP_ACCOUNT,
				     PAGE_KERNEL,
				     0, node, __builtin_return_address(0));

	/*
	 * We can't call find_vm_area() in interrupt context, and
	 * free_thread_stack() can be called in interrupt context,
	 * so cache the vm_struct.
	 */
	if (stack) {
		tsk->stack_vm_area = find_vm_area(stack);
		tsk->stack = stack;
	}
```
```
crash> task | grep stack
  stack = 0xffff97c5825e0000,
  stack_canary = 2863369865746246656,
  curr_ret_stack = -1,
  ret_stack = 0x0,
  stack_vm_area = 0xffff8c900af5b040,
  stack_refcount = {
crash> grep 0xffff97c5825e0000 /proc/vmallocinfo
0xffff97c5825e0000-0xffff97c5825e5000   20480 dup_task_struct+0x49/0x300 pages=4 vmalloc N0=4
crash>
```
## 进程管理
`current`永远指向当前cpu上运行的进程的task_struct, 实现方式如下
``` c
DECLARE_PER_CPU(struct task_struct *, current_task);

static __always_inline struct task_struct *get_current(void)
{
	return this_cpu_read_stable(current_task);
}

#define current get_current()
```
`init_task`代表了pid为0的进程, 即swapper/0, 通过它和`task_struct.tasks`可以找到所有进程
``` 
crash> list task_struct.tasks -s task_struct.comm -h init_task | head -19
ffffffffb481a940
  comm = "swapper/0\000\000\000\000\000\000",
ffff9dd300218000
  comm = "systemd\000\060\000\000\000\000\000\000",
ffff9dd30021e300
  comm = "kthreadd\000\000\000\000\000\000\000",
ffff9dd30021ca40
  comm = "rcu_gp\000d\000\000\000\000\000\000\000",
ffff9dd3002198c0
  comm = "rcu_par_gp\000\000\000\000\000",
ffff9dd30023b180
  comm = "kworker/0:0H\000\000\000",
ffff9dd30023ca40
  comm = "mm_percpu_wq\000\000\000",
ffff9dd3002398c0
  comm = "rcu_tasks_kthre",
ffff9dd300266300
  comm = "rcu_tasks_rude_",
ffff9dd300264a40

crash>
```
普通进程的nice值是优先级. 用户态显示的范围为 [-20 ~ 19], 值越低,优先级越高.对应的task_struct的字段为static_prio, 取值为[100～139]

``` c

#define MAX_NICE	19
#define MIN_NICE	-20
#define NICE_WIDTH	(MAX_NICE - MIN_NICE + 1)

/*
 * Priority of a process goes from 0..MAX_PRIO-1, valid RT
 * priority is 0..MAX_RT_PRIO-1, and SCHED_NORMAL/SCHED_BATCH
 * tasks are in the range MAX_RT_PRIO..MAX_PRIO-1. Priority
 * values are inverted: lower p->prio value means higher priority.
 *
 * The MAX_USER_RT_PRIO value allows the actual maximum
 * RT priority to be separate from the value exported to
 * user-space.  This allows kernel threads to set their
 * priority to a value higher than any user task. Note:
 * MAX_RT_PRIO must not be smaller than MAX_USER_RT_PRIO.
 */

#define MAX_USER_RT_PRIO	100
#define MAX_RT_PRIO		MAX_USER_RT_PRIO

#define MAX_PRIO		(MAX_RT_PRIO + NICE_WIDTH)
#define DEFAULT_PRIO		(MAX_RT_PRIO + NICE_WIDTH / 2)

/*
 * Convert user-nice values [ -20 ... 0 ... 19 ]
 * to static priority [ MAX_RT_PRIO..MAX_PRIO-1 ],
 * and back.
 */
#define NICE_TO_PRIO(nice)	((nice) + DEFAULT_PRIO)
#define PRIO_TO_NICE(prio)	((prio) - DEFAULT_PRIO)

/*
 * 'User priority' is the nice value converted to something we
 * can work with better when scaling various scheduler parameters,
 * it's a [ 0 ... 39 ] range.
 */
#define USER_PRIO(p)		((p)-MAX_RT_PRIO)
#define TASK_USER_PRIO(p)	USER_PRIO((p)->static_prio)
#define MAX_USER_PRIO		(USER_PRIO(MAX_PRIO))

/*
 * Convert nice value [19,-20] to rlimit style value [1,40].
 */
static inline long nice_to_rlimit(long nice)
{
	return (MAX_NICE - nice + 1);
}


/**
 * task_nice - return the nice value of a given task.
 * @p: the task in question.
 *
 * Return: The nice value [ -20 ... 0 ... 19 ].
 */
static inline int task_nice(const struct task_struct *p)
{
	return PRIO_TO_NICE((p)->static_prio);
}
```普通进程的nice值是优先级. 用户态显示的范围为 [-20 ~ 19], 值越低,优先级越高.对应的task_struct的字段为static_prio, 取值为[100～139]

``` c

#define MAX_NICE	19
#define MIN_NICE	-20
#define NICE_WIDTH	(MAX_NICE - MIN_NICE + 1)

/*
 * Priority of a process goes from 0..MAX_PRIO-1, valid RT
 * priority is 0..MAX_RT_PRIO-1, and SCHED_NORMAL/SCHED_BATCH
 * tasks are in the range MAX_RT_PRIO..MAX_PRIO-1. Priority
 * values are inverted: lower p->prio value means higher priority.
 *
 * The MAX_USER_RT_PRIO value allows the actual maximum
 * RT priority to be separate from the value exported to
 * user-space.  This allows kernel threads to set their
 * priority to a value higher than any user task. Note:
 * MAX_RT_PRIO must not be smaller than MAX_USER_RT_PRIO.
 */

#define MAX_USER_RT_PRIO	100
#define MAX_RT_PRIO		MAX_USER_RT_PRIO

#define MAX_PRIO		(MAX_RT_PRIO + NICE_WIDTH)
#define DEFAULT_PRIO		(MAX_RT_PRIO + NICE_WIDTH / 2)

/*
 * Convert user-nice values [ -20 ... 0 ... 19 ]
 * to static priority [ MAX_RT_PRIO..MAX_PRIO-1 ],
 * and back.
 */
#define NICE_TO_PRIO(nice)	((nice) + DEFAULT_PRIO)
#define PRIO_TO_NICE(prio)	((prio) - DEFAULT_PRIO)

/*
 * 'User priority' is the nice value converted to something we
 * can work with better when scaling various scheduler parameters,
 * it's a [ 0 ... 39 ] range.
 */
#define USER_PRIO(p)		((p)-MAX_RT_PRIO)
#define TASK_USER_PRIO(p)	USER_PRIO((p)->static_prio)
#define MAX_USER_PRIO		(USER_PRIO(MAX_PRIO))

/*
 * Convert nice value [19,-20] to rlimit style value [1,40].
 */
static inline long nice_to_rlimit(long nice)
{
	return (MAX_NICE - nice + 1);
}


/**
 * task_nice - return the nice value of a given task.
 * @p: the task in question.
 *
 * Return: The nice value [ -20 ... 0 ... 19 ].
 */
static inline int task_nice(const struct task_struct *p)
{
	return PRIO_TO_NICE((p)->static_prio);
}
```

## 调度细节

linux支持的调度策略如下
``` c
/*
 * The order of the sched class addresses are important, as they are
 * used to determine the order of the priority of each sched class in
 * relation to each other.
 */
#define SCHED_DATA				\
	STRUCT_ALIGN();				\
	__begin_sched_classes = .;		\
	*(__idle_sched_class)			\
	*(__fair_sched_class)			\
	*(__rt_sched_class)			\
	*(__dl_sched_class)			\
	*(__stop_sched_class)			\
	__end_sched_classes = .;

```

struct rq.clock 的单位是ns, cfs里`update_curr`用于更新进程运行时的统计量

分两种情况:
1. 主动式调度
   当写IO,或者等待其他资源时,主动让出cpu的, 代码中直接调用`__schedule`
2. 被动式调度
	- 自身时间执行时间过长,占用cpu过多, 调度管理会通过时钟中断调用`scheduler_tick`更新进程相关的统计信息, 判断是否需要重新调度. 如果时,则将该进程标记为`_TIF_NEED_RESCHED`
		- curr->sched_class->task_tick(rq, curr, 0) 里调用 entity_tick()
		- entity_tick() 调用 update_curr 更新当前进程 vruntime, 调用 check_preempt_tick 检测是否需要被调度
		- check_preempt_tick 中判断已运行的是否是否大于ideal_runtime(估算的进程应该运行的时间), 当前进程的vruntime和队列里最小的vruntime, 如果超过阈值,说明有其他进程更需要运行.
	- 被刚刚唤醒的进程,如果优先级更高,也会标记为`_TIF_NEED_RESCHED`
		- try_to_wake_up -> ttwu_queue -> ttwu_do_activate  -> activate_task 加入到可运行队列
		- try_to_wake_up -> ttwu_queue -> ttwu_do_activate  -> ttwu_do_wakeup 检查是否需要被调度
	- 抢占时机, 什么时候让已标记为`_TIF_NEED_RESCHED`的运行`__schedule`调出去
		- 用户态进程
			- 系统调用调用返回时,在`exit_to_user_mode_loop`里
			- 中断返回时, irqentry_exit --> irqentry_exit_to_user_mode --> exit_to_user_mode_prepare --> exit_to_user_mode_loop
		- 内核态进程
			如果没有配置`CONFIG_PREEMPT=y`, 那么内核态运行时无法抢占, 假设该功能打开则:
			- 中断返回时,irqentry_exit --> irqentry_exit_cond_resched --> preempt_schedule_irq
			- preempt_disable在某些路径关闭抢占后, 用preempt_enable打开时可能执行`__schedule`
		- 正是因为主流的linux发行版不支持内核抢占,所以系统调用运行时间过长会导致应用程序处理延迟,因为一直要等到临近返回用户态时才主动调度出去

无论主动还是被动, 都会通过``schedule``把进程切出去, schedule --> __schedule --> context_switch --> switch_to --> __switch_to_asm -->


``` c
#define switch_to(prev, next, last)					\
do {									\
	((last) = __switch_to_asm((prev), (next)));			\
} while (0)
```
``` c
SYM_FUNC_START(__switch_to_asm)
	/*
	 * Save callee-saved registers
	 * This must match the order in inactive_task_frame
	 */
	pushq	%rbp
	pushq	%rbx
	pushq	%r12
	pushq	%r13
	pushq	%r14
	pushq	%r15

	/* switch stack */
	movq	%rsp, TASK_threadsp(%rdi)
	movq	TASK_threadsp(%rsi), %rsp    
	/* 执行完这个命令之后, 后续操作都是在next这个进程的内核栈进行了 */

#ifdef CONFIG_STACKPROTECTOR
	movq	TASK_stack_canary(%rsi), %rbx
	movq	%rbx, PER_CPU_VAR(fixed_percpu_data) + stack_canary_offset
#endif

#ifdef CONFIG_RETPOLINE
	/*
	 * When switching from a shallower to a deeper call stack
	 * the RSB may either underflow or use entries populated
	 * with userspace addresses. On CPUs where those concerns
	 * exist, overwrite the RSB with entries which capture
	 * speculative execution to prevent attack.
	 */
	FILL_RETURN_BUFFER %r12, RSB_CLEAR_LOOPS, X86_FEATURE_RSB_CTXSW
#endif

	/* restore callee-saved registers */
	popq	%r15
	popq	%r14
	popq	%r13
	popq	%r12
	popq	%rbx
	popq	%rbp

	jmp	__switch_to
SYM_FUNC_END(__switch_to_asm)
```

## 进程退出

无论是进程还是线程退出,都会进入`do_exit`这个函数, 静态跟踪器`trace_sched_process_exit`就在这里函数里. 这个函数
执行了大量的释放资源操作, 比如释放文件,共享内存,虚拟内存等. 其中调用`exit_notify`完成以下几个动作:
1. `forget_original_parent` 即将退出的task的子task们的父task设置为即将退出task的父task. 如果即将退出的task对应的
线程组非空, 则从线程组里随机找个alive的作为父task.
2. 如果即将退出的task不是线程leader, 放入dead列表会,随后通过`release_task`释放最后的资源
3. 是线程leader的情况下, 线程组内仍有其他线程, 则不主动执行`release_task`释放资源
4. 是线程leader的情况下, 线程组内空了, 则调用`do_notify_parent` 发送`sigchild`信号给父task.
   a. 如果父task屏蔽或者忽略sigchild信号, 则放入dead列表会,随后通过`release_task`释放最后的资源
   b. 否则不主动释放资源, 等待父task执行waitpid等操作来回收资源.
5. 主动释放资源的话, task->state会置为`EXIT_DEAD`, 否则为`EXIT_ZOMBIE`

``` c
static void exit_notify(struct task_struct *tsk, int group_dead)
{
	bool autoreap;
	struct task_struct *p, *n;
	LIST_HEAD(dead);

	write_lock_irq(&tasklist_lock);
	forget_original_parent(tsk, &dead);

	if (group_dead)
		kill_orphaned_pgrp(tsk->group_leader, NULL);

	tsk->exit_state = EXIT_ZOMBIE;
	if (unlikely(tsk->ptrace)) {
		int sig = thread_group_leader(tsk) &&
				thread_group_empty(tsk) &&
				!ptrace_reparented(tsk) ?
			tsk->exit_signal : SIGCHLD;
		autoreap = do_notify_parent(tsk, sig);
	} else if (thread_group_leader(tsk)) {
		autoreap = thread_group_empty(tsk) &&
			do_notify_parent(tsk, tsk->exit_signal);
	} else {
		autoreap = true;
	}

	if (autoreap) {
		tsk->exit_state = EXIT_DEAD;
		list_add(&tsk->ptrace_entry, &dead);
	}

	/* mt-exec, de_thread() is waiting for group leader */
	if (unlikely(tsk->signal->notify_count < 0))
		wake_up_process(tsk->signal->group_exec_task);
	write_unlock_irq(&tasklist_lock);

	list_for_each_entry_safe(p, n, &dead, ptrace_entry) {
		list_del_init(&p->ptrace_entry);
		release_task(p);
	}
}
```

曾经遇到线程leader是Z状态, 组内有一个线程是D状态, 非常疑惑为什么父进程没有回收进程.
通过以下链接提供的方案, 模拟场景并测试,得出以下结论:

https://chrisdown.name/2024/02/05/reliably-creating-d-state-processes-on-demand.html

1. task收到kill信号号, 线程leader变为Z状态,但因整个线程组非空, 所以不会发送sigchild给父task.
说明只有整个进程全部退出,才会发sigchild给父进程.
2. 有个线程是D状态, 信号处于pending状态.不会立即执行.
3. 当D状态恢复后,在从内核态切为用户态前,会检查是否有pending的信号, 此时会继续调用`do_exit`把自己释放掉
4. 在`release_task`里不仅释放自身的资源, 如果检查线程组为空切线程leader处于Z状态, 通过`do_notify_parent`
发信号给父进程, 这样后续父进程可以通过waitpid等回收整个线程组即进程的资源.
``` c
	/*
	 * If we are the last non-leader member of the thread
	 * group, and the leader is zombie, then notify the
	 * group leader's parent process. (if it wants notification.)
	 */
	zap_leader = 0;
	leader = p->group_leader;
	if (leader != p && thread_group_empty(leader)
			&& leader->exit_state == EXIT_ZOMBIE) {
		/*
		 * If we were the last child thread and the leader has
		 * exited already, and the leader's parent ignores SIGCHLD,
		 * then we are the one who should release the leader.
		 */
		zap_leader = do_notify_parent(leader, leader->exit_signal);
		if (zap_leader)
			leader->exit_state = EXIT_DEAD;
	}
```

