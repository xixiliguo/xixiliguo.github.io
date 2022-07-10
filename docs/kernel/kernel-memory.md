---
title: "内存管理"
date: 2021-10-17T19:37:59+08:00
draft: false
---
## 分段
linux并没有利用分段实现虚拟内存, 但是却利用了dpl功能实现了权限控制. 用户态DPL是3, 内核态DPL是0, 当用户态程序 CPL为3时直接访问内核态的地址时，会因权限不足而报错。所以要通过syscal, int等特别指令触发切换, 这些指令会改变CPL值  
``` c
DEFINE_PER_CPU_PAGE_ALIGNED(struct gdt_page, gdt_page) = { .gdt = {
	/*
	 * We need valid kernel segments for data and code in long mode too
	 * IRET will check the segment types  kkeil 2000/10/28
	 * Also sysret mandates a special GDT layout
	 *
	 * TLS descriptors are currently at a different place compared to i386.
	 * Hopefully nobody expects them at a fixed place (Wine?)
	 */
	[GDT_ENTRY_KERNEL32_CS]		= GDT_ENTRY_INIT(0xc09b, 0, 0xfffff),
	[GDT_ENTRY_KERNEL_CS]		= GDT_ENTRY_INIT(0xa09b, 0, 0xfffff),
	[GDT_ENTRY_KERNEL_DS]		= GDT_ENTRY_INIT(0xc093, 0, 0xfffff),
	[GDT_ENTRY_DEFAULT_USER32_CS]	= GDT_ENTRY_INIT(0xc0fb, 0, 0xfffff),
	[GDT_ENTRY_DEFAULT_USER_DS]	= GDT_ENTRY_INIT(0xc0f3, 0, 0xfffff),
	[GDT_ENTRY_DEFAULT_USER_CS]	= GDT_ENTRY_INIT(0xa0fb, 0, 0xfffff),
} };
```
## 虚拟地址映射
x86_64下面分页机制采用四级目录, 相关数据结构在`arch/x86/include/asm/pgtable_64_types.h`
如果cpu支持5级分页, 当前centos9会自动激活这个特性
``` c
#define PGDIR_SHIFT	39
#define PTRS_PER_PGD	512
/*
 * 3rd level page
 */
#define PUD_SHIFT	30
#define PTRS_PER_PUD	512

/*
 * PMD_SHIFT determines the size of the area a middle-level
 * page table can map
 */
#define PMD_SHIFT	21
#define PTRS_PER_PMD	512

/*
 * entries per page directory level
 */
#define PTRS_PER_PTE	512

#define PMD_SIZE	(_AC(1, UL) << PMD_SHIFT)
#define PMD_MASK	(~(PMD_SIZE - 1))
#define PUD_SIZE	(_AC(1, UL) << PUD_SHIFT)
#define PUD_MASK	(~(PUD_SIZE - 1))
#define PGDIR_SIZE	(_AC(1, UL) << PGDIR_SHIFT)
#define PGDIR_MASK	(~(PGDIR_SIZE - 1))
```
x86_64的虚拟地址是64位, 但只使用48位用于映射到物理地址.因为处理器地址只有48条,要求内存地址48位到63位必须相同, 具体四级目录用到的位数如下:  
PGD(9) + PUD(9) + PMD(9) + PTE(9) + 页内偏移(12)  

查询当前系统一页的大小
``` bash
[root@localhost ~]# getconf PAGE_SIZE
4096
```
## 进程空间

进程空间分为用户态地址空间和内核态地址空间, 32位下面用户态空间是3G, 内核态时1G. 分界线为宏`#define TASK_SIZE`, 这个定义了用户态空间的最大地址, 根据下面的宏, 计算出x86_64下面为`0x00007FFFFFFFF000`
``` c
#define TASK_SIZE		(test_thread_flag(TIF_ADDR32) ? \
					IA32_PAGE_OFFSET : TASK_SIZE_MAX)

#define TASK_SIZE_MAX	((1UL << __VIRTUAL_MASK_SHIFT) - PAGE_SIZE)

#ifdef CONFIG_X86_5LEVEL
#define __VIRTUAL_MASK_SHIFT	(pgtable_l5_enabled() ? 56 : 47)
#else
#define __VIRTUAL_MASK_SHIFT	47
#endif
```
```
crash> struct mm_struct -x 0xffff99da00e79540 | grep size
    task_size = 0x7ffffffff000,
crash>
```
x86_64下  
用户空间   0x0000000000000000   ~   0x00007FFFFFFFF000      128T  
内核空间   0xFFFF800000000000   ~   0xFFFFFFFFFFFFFFFF      128T  
0x00007FFFFFFFF000 到 0xFFFF800000000000 为空洞区域  

在execve时,将该值设置到mm_struct上面去
``` c
	/* Set the new mm task size. We have to do that late because it may
	 * depend on TIF_32BIT which is only updated in flush_thread() on
	 * some architectures like powerpc
	 */
	current->mm->task_size = TASK_SIZE;
```
``` bash
crash> struct mm_struct.task_size -x 0xffff9f814be29f80
    task_size = 0x7ffffffff000
crash>
```


在x86_64, 内核态从`0xffff888000000000` 开始映射整个物理内存
``` c 
#define __PAGE_OFFSET_BASE_L4	_AC(0xffff888000000000, UL)

#ifdef CONFIG_DYNAMIC_MEMORY_LAYOUT
#define __PAGE_OFFSET           page_offset_base
```
如果打开了kaslr, 在`kernel_randomize_memory`里会对`page_offset_base`随机向上偏移一些位置, 如下是实际运行的cents8里的值:
``` bash
crash> px page_offset_base
page_offset_base = $20 = 0xffff9f7f40000000
crash>
```

参考文档: 
Documentation/x86/x86_64/mm.txt

###  用户态
在load_elf_binary函数里
`setup_new_exec`里设置mm->mmap_base和mm->task_size, `kernel.randomize_va_space = 2`表示需要随机化部分区域的起始地址, 包括mmap, stack等  
`setup_arg_pages`里设置mm->arg_start和mm->start_stack, 此时这两个值一样  
`create_elf_tables` 重新设置了mm->start_stack  
start_stack指栈底, 它与arg_start之前存放了一些信息, 比如执行命令的参数个数和每一个参数的具体字符串指针, 每一个环境变量的指针. arg_start ~ arg_end, env_start ~ env_end 之间才是真正存放这些数据的地方. 在程序内部改变这些指针值就能改变参数和环境变量信息  

###  内核态

page_offset_base开始的64T范围内是直接映射内存, 这些虚拟地址对应的物理地址就是 减去page_offset_base  
page_offset_base默认是0xffff888000000000, 如果`CONFIG_RANDOMIZE_MEMORY=y`则会随机偏移些  
每个进程对应的task_struct分配在这个区域, 可以减去page_offset_base直接得到物理地址  
```
crash> vtop ffff9e68002398c0
VIRTUAL           PHYSICAL
ffff9e68002398c0  1002398c0

PGD DIRECTORY: ffffffffb2e10000
PAGE DIRECTORY: 1c601067
   PUD: 1c601d00 => 1c606067
   PMD: 1c606008 => 1057a9063
   PTE: 1057a91c8 => 8000000100239063
  PAGE: 100239000

      PTE         PHYSICAL   FLAGS
8000000100239063  100239000  (PRESENT|RW|ACCESSED|DIRTY|NX)

      PAGE        PHYSICAL      MAPPING       INDEX CNT FLAGS
ffffdba004008e40 100239000 dead000000000008        0  0 17ffffc0000000
crash> px page_offset_base
page_offset_base = $15 = 0xffff9e6700000000
crash> eval ffff9e68002398c0 - 0xffff9e6700000000
hexadecimal: 1002398c0
    decimal: 4297300160
      octal: 40010714300
     binary: 0000000000000000000000000000000100000000001000111001100011000000
crash>
```
vmalloc_base从 0xffffc90000000000UL开始, 随机偏移后, 可通过如下命令获取当前值
```
crash> px vmalloc_base
vmalloc_base = $16 = 0xffffb9cb00000000
crash>
```
vmemmap_base从 0xffffea0000000000UL开始, 随机偏移后, 可通过如下命令获取当前值, 存放 struct page
```
crash> px vmemmap_base
vmemmap_base = $17 = 0xffffdba000000000
crash>
```
内核的代码段从__START_KERNEL_map开始, 对应的物理地址是减去 __START_KERNEL_map 加上 phys_base
``` c
#define __START_KERNEL_map	_AC(0xffffffff80000000, UL)
```

## 物理分配
当前主流都是numa结构, 即一个CPU对应本地内存, 当本地内存不够, 再通过总线访问其他节点的内存. 内存管理的最小单位是页, 通常是4K, 它属于Zone, Zone属于node节点节. node节点就是numa节点

如下表示该OS可以支持 1<< 10 == 1024个numa节点
``` bash
[root@localhost ~]# grep CONFIG_NODES_SHIFT /boot/config-5.14.0-22.el9.x86_64
CONFIG_NODES_SHIFT=10
```
一台4u8G的机器, 只有一个numa. cpu0~3属于node0
``` bash
[root@localhost ~]# lscpu | grep NUMA
NUMA node(s):                    1
NUMA node0 CPU(s):               0-3
```
node0里面的跟物理内存的相关的数据如下
``` c
struct pglist_data *node_data[MAX_NUMNODES] __read_mostly;
EXPORT_SYMBOL(node_data);
```
```
crash> p node_data[0]
$22 = (pg_data_t *) 0xffff94e6dffd1000
crash>  struct pg_data_t.node_id,nr_zones,node_start_pfn,node_present_pages,node_spanned_pages -x 0xffff94e6dffd1000
  node_id = 0x0,
  nr_zones = 0x3,
  node_start_pfn = 0x1,              //从页号1开始
  node_present_pages = 0x1fff8e,     //该node管理0x1fff8e个可用的页. 
  node_spanned_pages = 0x21ffff,     //管理0x21ffff页(8G), 除了包含present_pages, 还包含了空洞的物理地址. 这些页不可用.
crash> struct zone.name,zone_start_pfn,spanned_pages,present_pages,managed_pages -x ffff94e6dffd1000 5
  name = 0xffffffffa9fa3ed3 "DMA",
  zone_start_pfn = 0x1,
  spanned_pages = 0xfff,
  present_pages = 0xf9e,
  managed_pages = {
    counter = 0xf00
  },

  name = 0xffffffffa9f4c32c "DMA32",
  zone_start_pfn = 0x1000,
  spanned_pages = 0xff000,
  present_pages = 0xdeff0,
  managed_pages = {
    counter = 0xcaff0
  },

  name = 0xffffffffa9f4c222 "Normal",
  zone_start_pfn = 0x100000,
  spanned_pages = 0x120000,
  present_pages = 0x120000,
  managed_pages = {
    counter = 0x1145ec
  },

  name = 0xffffffffa9f4c229 "Movable",
  zone_start_pfn = 0x0,
  spanned_pages = 0x0,
  present_pages = 0x0,
  managed_pages = {
    counter = 0x0
  },

  name = 0xffffffffa9f9924d "Device",
  zone_start_pfn = 0x0,
  spanned_pages = 0x0,
  present_pages = 0x0,
  managed_pages = {
    counter = 0x0
  },
crash>
```
0x1fff8e个可用页等于 8388152K
```
[root@localhost ~]# dmesg -T | grep Mem
[Sun Dec 26 11:12:09 2021] Memory: 3442876K/8388152K available (14345K kernel code, 5931K rwdata, 8944K rodata, 2656K init, 5448K bss, 556100K reserved, 0K cma-reserved)
```
上面可以看到64位下有三个zone, 分别是 DMA, DMA32, Normal  
struct page代表一页, 页通过伙伴系统管理. 所有空闲页挂在11个页块链表上. 每个链表包含相同连续页的地址. 有 1、2、4、8、16、32、64、128、256、512 和 1024.  所以一次最大可申请1024个物理地址连续的页(即4M的内存).   这些链表存在struct zone.free_area  
第 i 个页块链表中，页块中页的数目为 2^i

``` c
#define MAX_ORDER 11
```
order为i时, 意味着申请 2 ^ i 个连续页, 如果free_area[i]没有, 则去free_area[i+1]里面找, 依次类推  