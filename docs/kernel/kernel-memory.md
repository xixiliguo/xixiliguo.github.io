---
title: "内存管理"
date: 2021-10-17T19:37:59+08:00
draft: false
---

## 虚拟地址映射与进程空间
x86_64下面分页机制采用四级目录, 相关数据结构在`arch/x86/include/asm/pgtable_64_types.h`
如果cpu支持5级分页, 当前centos8会自动激活这个特性
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
虚拟地址是64位, 但在x86_64下只使用48位用于映射到物理地址.分别如下:
PGD(9) + PUD(9) + PMD(9) + PTE(9) + 页内偏移(12)  

查询当前系统一页的大小
``` bash
[root@localhost ~]# getconf PAGE_SIZE
4096
```

进程空间分为用户态地址空间和内核态地址空间, 32位下面用户态空间是3G, 内核态时1G. 分界线为宏`#define TASK_SIZE`, 这个定义了用户态空间的最大地址, 根据下面的宏, 计算出x86_64下面为`0x7ffffffff000`
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
