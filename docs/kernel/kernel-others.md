

## 中断
linux并没有利用分段实现虚拟内存, 但是却利用了dpl功能实现了权限控制. 用户态DPL是3, 内核态DPL是0, 当用户态程序 CPL为3时直接访问内核态的地址时，会因权限不足而报错。所以要通过syscal, int等特别指令触发切换, 这些指令会改变CPL值  

通过如下两个函数注册中断, irq是OS软件层面的概念，系统运行过程中唯一对应一个中断，硬件并不清楚这个值。在注册中断的过程中，在x86上面会申请vector，与irq对应的irq_desc结构体关联。
``` c
int request_irq(unsigned int irq, irq_handler_t handler, unsigned long flags,
	    const char *name, void *dev)
int request_threaded_irq(unsigned int irq, irq_handler_t handler,
			 irq_handler_t thread_fn, unsigned long irqflags,
			 const char *devname, void *dev_id)
```
下面是注册中断时，申请并激活vector的函数调用关系。在`assign_vector_locked`里申请一个新的vetor, 在`apic_update_vector`里
通过语句 `per_cpu(vector_irq, newcpu)[newvec] = desc;` 将irq对应的结构体irq_desc与cpu, vector关联。到这里只是完成软件
层面的关联， 后续通过`x86_vector_msi_compose_msg`将这些信息写入到硬件acpi里。
```
./efunc trace -e "request_threaded_irq" -a ":arch/x86/kernel/apic/*"
TIME: 19:33:00.781051 -> 19:33:00.782405 PID/TID: 101632/101632 (kworker/u8:3 kworker/u8:3) 
 CPU   DURATION | FUNCTION GRAPH
 ---   -------- | --------------
  0)            | → request_threaded_irq irq=38 handler=0xffffffffabe27330 thread_fn=0x0 irqflags=2097152 devname=0xffff891fc47d6c00 dev_id=0xffff891feae2e900 
  0)            |   → x86_vector_activate dom=0xffff891fc01db300 irqd=0xffff891fc40c9ea0 reserve=false 
  0)            |     → assign_irq_vector_any_locked irqd=0xffff891fc40c9ea0 
  0)            |       → assign_vector_locked irqd=0xffff891fc40c9ea0 dest=0xffff891fc0069f30 
  0)      476ns |         ↔ apic_update_vector irqd=0xffff891fc40c9ea0 newvec=42 newcpu=0 ret=void
  0)            |         → apic_update_irq_cfg irqd=0xffff891fc40c9ea0 vector=42 cpu=0 
  0)      365ns |           ↔ apic_default_calc_apicid cpu=0 ret=0
  0)    1.986µs |         ← apic_update_irq_cfg ret=void
  0)    4.909µs |       ← assign_vector_locked ret=0
  0)    6.193µs |     ← assign_irq_vector_any_locked ret=0
  0)    7.618µs |   ← x86_vector_activate ret=0
  0)            |   → x86_vector_msi_compose_msg data=0xffff891fc40c9ea0 msg=0xffffac94471e36a8 
  0)      412ns |     ↔ __irq_msi_compose_msg cfg=0xffff891fc32c8100 msg=0xffffac94471e36a8 dmar=false ret=void
  0)    1.217µs |   ← x86_vector_msi_compose_msg ret=void
  0)            |   → msi_set_affinity irqd=0xffff891fc6badc28 mask=0xffffffffae480e40 force=false 
  0)      351ns |     ↔ irqd_cfg irqd=0xffff891fc6badc28 ret=0xffff891fc32c8100
  0)            |     → apic_set_affinity irqd=0xffff891fc40c9ea0 dest=0xffffffffae480e40 force=false 
  0)      417ns |       ↔ assign_vector_locked irqd=0xffff891fc40c9ea0 dest=0xffff891fc0069f30 ret=0
  0)    1.222µs |     ← apic_set_affinity ret=0
  0)      360ns |     ↔ __irq_msi_compose_msg cfg=0xffff891fc32c8100 msg=0xffffac94471e3638 dmar=false ret=void
  0)   25.806µs |   ← msi_set_affinity ret=0
  0)            |   → __sysvec_apic_timer_interrupt regs=0xffffac94471e3658 
  0)    3.308µs |     ↔ lapic_next_deadline delta=236268 evt=0xffff8920e8c20140 ret=0
  0)    6.189µs |   ← __sysvec_apic_timer_interrupt ret=void
  0) 1.353121ms | ← request_threaded_irq ret=0
```
当中断发生时, 获悉触发中断的cpu和vector的前提下, 主要的函数调用流程如下，多个irqaction可以共享中断，
一个irq对应一个irq_desc， 一个irq_desc可以有多个irqaction。
``` c
__common_interrupt
	desc = __this_cpu_read(vector_irq[vector]); // 获取desc
	--> handle_irq(desc, regs);  //处理具体的中断
        --> desc->handle_irq(desc);
            --> handle_edge_irq
                --> handle_irq_event
                    --> __handle_irq_event_percpu
                    	for_each_action_of_desc(desc, action) {  
                        trace_irq_handler_entry(irq, action);
                        res = action->handler(irq, action->dev_id);
                        trace_irq_handler_exit(irq, action, res);
                        }
```
irq中断号与irq_desc指针的关系存储在全局变量irq_desc_tree里， 结构式是xarray, 在crash里可使用下面命令查询。
```
tree -t xarray irq_desc_tree -s irq_desc
```
参考:
https://cloud.tencent.com/developer/article/1518703

## 时间

`/sys/devices/system/clocksource/clocksource0/current_clocksource` 显示当前使用的时钟源
`/sys/devices/system/clocksource/clocksource0/available_clocksource` 显示当前可用的时钟源
x86的虚拟机一般使用tsc, 这个是intelCPU自带的，比kvm-clock更准确。  
软中断里关于时钟中断有两个， TIMER 和 HRTIMER。TIMER 的单位是jiffies（在HZ为1000的情况下是1ms），
HRTIMER是高精度的，单位是1ns。  

TIMER里有两个重要的结构体， `timer_list` `timer_base`
``` c
struct timer_list {
    struct hlist_node entry;
    unsigned long expires;
    void (*function)(struct timer_list *);
    u32 flags;
    unsigned long rh_reserved1;
    unsigned long rh_reserved2;
}

struct timer_base {
	raw_spinlock_t		lock;
	struct timer_list	*running_timer;
	unsigned long		clk;
	unsigned long		next_expiry;
	unsigned int		cpu;
	bool			next_expiry_recalc;
	bool			is_idle;
	bool			timers_pending;
	DECLARE_BITMAP(pending_map, WHEEL_SIZE);
	struct hlist_head	vectors[WHEEL_SIZE];
} ____cacheline_aligned;
```
timer_list 代表一个定时器，定义了下一次过期时间和要执行的函数。 timer_base，每个cpu上面有两个，每个定时器都挂在base上面，触发
软中断后，就会遍历上面的定时器，谁过期了就执行谁。 

时钟源现在基本都是高精度的，单位是1ns。 它不受HZ的控制，可根据当前所有的定时器的实际过期时间动态调整频率。 用于统计进程cpu信息，
是否需要抢占的调度中断运行在高精度的时间中断里。调用栈如下：

```
TIME: 22:14:28.862008 -> 22:14:28.862010 PID/TID: 0/0 (swapper/1 swapper/1) 
 CPU   DURATION | FUNCTION GRAPH
 ---   -------- | --------------
  1)      981ns | ↔ account_process_tick p=0xffff891fc02e8000 user_tick=0 ret=void

 (inline) run_local_timers                                      kernel/time/timer.c:1999
update_process_times+0x18                                       kernel/time/timer.c:2024
tick_sched_handle+0x21                                          kernel/time/tick-sched.c:256
tick_nohz_highres_handler+0x6d                                  kernel/time/tick-sched.c:1523
 (inline) __run_hrtimer                                         kernel/time/hrtimer.c:1813
__hrtimer_run_queues+0x10f                                      kernel/time/hrtimer.c:1877
hrtimer_interrupt+0xff                                          kernel/time/hrtimer.c:1942
 (inline) local_apic_timer_interrupt                            arch/x86/kernel/apic/apic.c:1044
__sysvec_apic_timer_interrupt+0x51                              arch/x86/kernel/apic/apic.c:1061
sysvec_apic_timer_interrupt+0x6d                                arch/x86/kernel/apic/apic.c:1055
asm_sysvec_apic_timer_interrupt+0x16                            arch/x86/include/asm/idtentry.h:649
cpuidle_enter_state+0xbc                                        drivers/cpuidle/cpuidle.c:292
cpuidle_enter+0x29                                              drivers/cpuidle/cpuidle.c:391
cpuidle_idle_call+0xf8                                          kernel/sched/idle.c:213
do_idle+0x77                                                    kernel/sched/idle.c:307
cpu_startup_^C
hrtimer_interrupt+0xff                                          kernel/time/hrtimer.c:1942
 (inline) local_apic_timer_interrupt                            arch/x86/kernel/apic/apic.c:1044
__sysvec_apic_timer_interrupt+0x51                              arch/x86/kernel/apic/apic.c:1061
sysvec_apic_timer_interrupt+0x6d                                arch/x86/kernel/apic/apic.c:1055
asm_sysvec_apic_timer_interrupt+0x16                            arch/x86/include/asm/idtentry.h:649
cpuidle_enter_state+0xbc                                        drivers/cpuidle/cpuidle.c:292
cpuidle_enter+0x29                                              drivers/cpuidle/cpuidle.c:391
cpuidle_idle_call+0xf8                                          kernel/sched/idle.c:213
do_idle+0x77                                                    kernel/sched/idle.c:307
cpu_startup_entry+0x25                                          kernel/sched/idle.c:402
 (inline) ap_starting                                           arch/x86/kernel/smpboot.c:206
start_secondary+0x115                                           arch/x86/kernel/smpboot.c:286
secondary_startup_64_no_verify+0x187                            arch/x86/kernel/head_64.S:462
```
```hrtimer_interrupt`函数主要工作如下：
``` c
void hrtimer_interrupt(struct clock_event_device *dev)
{
	struct hrtimer_cpu_base *cpu_base = this_cpu_ptr(&hrtimer_bases); //或许当前cpu的 base

	if (!ktime_before(now, cpu_base->softirq_expires_next)) {
		cpu_base->softirq_expires_next = KTIME_MAX;
		cpu_base->softirq_activated = 1;
		raise_hrtimer_softirq();
	}   // 如果hrtimer的软中断也过期了则触发

	__hrtimer_run_queues(cpu_base, now, flags, HRTIMER_ACTIVE_HARD);   //遍历所有定时器，如果过期就执行。

	/* Reevaluate the clock bases for the [soft] next expiry */
	expires_next = hrtimer_update_next_event(cpu_base);
	tick_program_event(expires_next, 1);    //动态控制硬件下次触发中断的周期。 
}
```
hrtimer 使用红黑树管理所有的定时器。