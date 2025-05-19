
介绍ebpf的使用和加载原理, 会配合`https://github.com/cilium/ebpf`源码说明


下面C代码编译时,都假设需要的头文件全部在当前目录下

## 全局变量的实现

C语言的全局变量在ebpf里是通过array map来实现的, 也就是将其转换为一个array map, 只有一个Entry,通过
从map起始位置开始的偏移量来访问.

``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>

volatile char c1 = 1;
volatile int  d1 = 2;

volatile const char cc1 = 3;

SEC("kprobe/test")
int hello(void *ctx) {
    int re = c1 + d1 + cc1;
    return re;
}
```
通过运行`clang -g -O2 -target bpf -c test.c  -I.` 编译后生成`test.o`文件

使用`llvm-readelf`检查elf文件, 从符号表看 c1, d1的section是5,即位于`.data`这个section.
cc1 位于`.rodata`. 符合一贯的C语言风格. 只读的位于`.rodata`.

``` bash
[root@localhost test-c]# llvm-readelf -Ss test.o
There are 22 section headers, starting at offset 0x958:

Section Headers:
  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .strtab           STRTAB          0000000000000000 000894 0000c2 00      0   0  1
  [ 2] .text             PROGBITS        0000000000000000 000040 000000 00  AX  0   0  4
  [ 3] kprobe/test       PROGBITS        0000000000000000 000040 000080 00  AX  0   0  8
  [ 4] .relkprobe/test   REL             0000000000000000 000650 000030 10   I 21   3  8
  [ 5] .data             PROGBITS        0000000000000000 0000c0 000008 00  WA  0   0  4
  [ 6] .rodata           PROGBITS        0000000000000000 0000c8 000001 00   A  0   0  1
  [ 7] .debug_loc        PROGBITS        0000000000000000 0000c9 000023 00      0   0  1
  [ 8] .debug_abbrev     PROGBITS        0000000000000000 0000ec 000079 00      0   0  1
  [ 9] .debug_info       PROGBITS        0000000000000000 000165 0000bc 00      0   0  1
  [10] .rel.debug_info   REL             0000000000000000 000680 000130 10   I 21   9  8
  [11] .debug_str        PROGBITS        0000000000000000 000221 000067 01  MS  0   0  1
  [12] .BTF              PROGBITS        0000000000000000 000288 000173 00      0   0  4
  [13] .rel.BTF          REL             0000000000000000 0007b0 000030 10   I 21  12  8
  [14] .BTF.ext          PROGBITS        0000000000000000 0003fc 0000b0 00      0   0  4
  [15] .rel.BTF.ext      REL             0000000000000000 0007e0 000080 10   I 21  14  8
  [16] .debug_frame      PROGBITS        0000000000000000 0004b0 000028 00      0   0  8
  [17] .rel.debug_frame  REL             0000000000000000 000860 000020 10   I 21  16  8
  [18] .debug_line       PROGBITS        0000000000000000 0004d8 000052 00      0   0  1
  [19] .rel.debug_line   REL             0000000000000000 000880 000010 10   I 21  18  8
  [20] .llvm_addrsig     LLVM_ADDRSIG    0000000000000000 000890 000004 00   E 21   0  1
  [21] .symtab           SYMTAB          0000000000000000 000530 000120 18      1   8  8
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  R (retain), p (processor specific)

Symbol table '.symtab' contains 12 entries:
   Num:    Value          Size Type    Bind   Vis       Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT   UND
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT   ABS test.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT     3 kprobe/test
     3: 0000000000000000     0 SECTION LOCAL  DEFAULT     7 .debug_loc
     4: 0000000000000000     0 SECTION LOCAL  DEFAULT     8 .debug_abbrev
     5: 0000000000000000     0 SECTION LOCAL  DEFAULT    11 .debug_str
     6: 0000000000000000     0 SECTION LOCAL  DEFAULT    16 .debug_frame
     7: 0000000000000000     0 SECTION LOCAL  DEFAULT    18 .debug_line
     8: 0000000000000000   128 FUNC    GLOBAL DEFAULT     3 hello
     9: 0000000000000000     1 OBJECT  GLOBAL DEFAULT     5 c1
    10: 0000000000000004     4 OBJECT  GLOBAL DEFAULT     5 d1
    11: 0000000000000000     1 OBJECT  GLOBAL DEFAULT     6 cc1
```
`.data`整个section会生成一个map, 类型是`array`,  符号表里c1的value是0, size是1, 表示c1起始于map的offset为0的位置,
大小是1个字节. 同理 d1的起始偏移量为4, 大小是4个字节.
如下可以看到c1的值为1, d1的值为2. 与C代码里初始值一致.
``` bash
[root@localhost test-c]# llvm-readelf -x .data test.o
Hex dump of section '.data':
0x00000000 01000000 02000000                   ........
```

这块使用到了重定向技术,  `.relkprobe/test` 类型是重定向, 根据后面的info 3, 可知它是section 3 即kprobe/test
的重定向表.

``` bash
[root@localhost test-c]# llvm-readelf -S test.o
There are 22 section headers, starting at offset 0x958:

Section Headers:
  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .strtab           STRTAB          0000000000000000 000894 0000c2 00      0   0  1
  [ 2] .text             PROGBITS        0000000000000000 000040 000000 00  AX  0   0  4
  [ 3] kprobe/test       PROGBITS        0000000000000000 000040 000080 00  AX  0   0  8
  [ 4] .relkprobe/test   REL             0000000000000000 000650 000030 10   I 21   3  8
  [ 5] .data             PROGBITS        0000000000000000 0000c0 000008 00  WA  0   0  4
  [ 6] .rodata           PROGBITS        0000000000000000 0000c8 000001 00   A  0   0  1
  [ 7] .debug_loc        PROGBITS        0000000000000000 0000c9 000023 00      0   0  1
  [ 8] .debug_abbrev     PROGBITS        0000000000000000 0000ec 000079 00      0   0  1
  [ 9] .debug_info       PROGBITS        0000000000000000 000165 0000bc 00      0   0  1
  [10] .rel.debug_info   REL             0000000000000000 000680 000130 10   I 21   9  8
  [11] .debug_str        PROGBITS        0000000000000000 000221 000067 01  MS  0   0  1
  [12] .BTF              PROGBITS        0000000000000000 000288 000173 00      0   0  4
  [13] .rel.BTF          REL             0000000000000000 0007b0 000030 10   I 21  12  8
  [14] .BTF.ext          PROGBITS        0000000000000000 0003fc 0000b0 00      0   0  4
  [15] .rel.BTF.ext      REL             0000000000000000 0007e0 000080 10   I 21  14  8
  [16] .debug_frame      PROGBITS        0000000000000000 0004b0 000028 00      0   0  8
  [17] .rel.debug_frame  REL             0000000000000000 000860 000020 10   I 21  16  8
  [18] .debug_line       PROGBITS        0000000000000000 0004d8 000052 00      0   0  1
  [19] .rel.debug_line   REL             0000000000000000 000880 000010 10   I 21  18  8
  [20] .llvm_addrsig     LLVM_ADDRSIG    0000000000000000 000890 000004 00   E 21   0  1
  [21] .symtab           SYMTAB          0000000000000000 000530 000120 18      1   8  8
Key to Flags:
  W (write), A (alloc), X (execute), M (merge), S (strings), I (info),
  L (link order), O (extra OS processing required), G (group), T (TLS),
  C (compressed), x (unknown), o (OS specific), E (exclude),
  R (retain), p (processor specific)
```
进一步检查有三个重定向项, 第一行表示针对section 3 即kprobe/test, 它的偏移量为0的位置, 有一个类型为
`R_BPF_64_64`的重定向项, 需要重新定义到c1的符号value这个值, 也就是0
``` bash
[root@localhost test-c]# llvm-readelf -r test.o

Relocation section '.relkprobe/test' at offset 0x650 contains 3 entries:
    Offset             Info             Type               Symbol's Value  Symbol's Name
0000000000000000  0000000900000001 R_BPF_64_64            0000000000000000 c1
0000000000000018  0000000a00000001 R_BPF_64_64            0000000000000004 d1
0000000000000048  0000000b00000001 R_BPF_64_64            0000000000000000 cc1
```

反汇编test.o, 可以看到将c1对应的内存地址读取后赋值给寄存器R1, d1对应的内存地址读取后赋值给寄存器R2
``` bash
[root@localhost test-c]# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000000:  R_BPF_64_64  c1
       2:       71 11 00 00 00 00 00 00 r1 = *(u8 *)(r1 + 0x0)   //c1的size是1, 所以读取1个字节
       3:       18 02 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r2 = 0x0 ll
                0000000000000018:  R_BPF_64_64  d1
       5:       61 20 00 00 00 00 00 00 r0 = *(u32 *)(r2 + 0x0)  //d1的size是4, 所以读取4个字节
       6:       67 01 00 00 38 00 00 00 r1 <<= 0x38
       7:       c7 01 00 00 38 00 00 00 r1 s>>= 0x38
       8:       0f 10 00 00 00 00 00 00 r0 += r1
       9:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000048:  R_BPF_64_64  cc1
      11:       71 11 00 00 00 00 00 00 r1 = *(u8 *)(r1 + 0x0)
      12:       67 01 00 00 38 00 00 00 r1 <<= 0x38
      13:       c7 01 00 00 38 00 00 00 r1 s>>= 0x38
      14:       0f 10 00 00 00 00 00 00 r0 += r1
      15:       95 00 00 00 00 00 00 00 exit
```

通过`bpftool prog load test.o /sys/fs/bpf/test`加载成功, 再使用
`bpftool prog dump xlated name hello opcodes` 看下经过loader重定向后的字节码

``` bash
[root@localhost test-c]# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; int re = c1 + d1 + cc1;
   0: (18) r1 = map[id:6][0]+0
       18 21 00 00 06 00 00 00 00 00 00 00 00 00 00 00
   2: (71) r1 = *(u8 *)(r1 +0)
       71 11 00 00 00 00 00 00
; int re = c1 + d1 + cc1;
   3: (18) r2 = map[id:6][0]+4
       18 22 00 00 06 00 00 00 00 00 00 00 04 00 00 00
   5: (61) r0 = *(u32 *)(r2 +0)
       61 20 00 00 00 00 00 00
; int re = c1 + d1 + cc1;
   6: (67) r1 <<= 56
       67 01 00 00 38 00 00 00
   7: (c7) r1 s>>= 56
       c7 01 00 00 38 00 00 00
; int re = c1 + d1 + cc1;
   8: (0f) r0 += r1
       0f 10 00 00 00 00 00 00
; int re = c1 + d1 + cc1;
   9: (18) r1 = map[id:7][0]+0
       18 21 00 00 07 00 00 00 00 00 00 00 00 00 00 00
  11: (71) r1 = *(u8 *)(r1 +0)
       71 11 00 00 00 00 00 00
  12: (67) r1 <<= 56
       67 01 00 00 38 00 00 00
  13: (c7) r1 s>>= 56
       c7 01 00 00 38 00 00 00
; int re = c1 + d1 + cc1;
  14: (0f) r0 += r1
       0f 10 00 00 00 00 00 00
; return re;
  15: (95) exit
       95 00 00 00 00 00 00 00
```

对比发现
```
       0:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000000:  R_BPF_64_64  c1
``` 
变为
```
   0: (18) r1 = map[id:6][0]+0
       18 21 00 00 06 00 00 00 00 00 00 00 00 00 00 00
```
18 表示是加载操作,  第二个字节从 01 变为 21, 意味着源是mapvalue, 目的仍然是R1, 
`06 00 00 00` 表示map的id是6, 最后的四个字节`00 00 00 00 00` 表示偏移量是0. 

在`(ec *elfCode) relocateInstruction`这个函数里, 可以看到将 src设置为 PseudoMapValue, 符号表里的value
设置为offset, 那么 map-ptr + offset 就是该值的内存地址
这里需要说明下全局变量对应的array map的MaxEntries为1, 只有这样才能通过offset找到值. 也称为 direct map load
``` go
	case dataSection:
		var offset uint32
		switch typ {
		case elf.STT_SECTION:
			if bind != elf.STB_LOCAL {
				return fmt.Errorf("direct load: %s: %w: %s", name, errUnsupportedBinding, bind)
			}

			// This is really a reference to a static symbol, which clang doesn't
			// emit a symbol table entry for. Instead it encodes the offset in
			// the instruction itself.
			offset = uint32(uint64(ins.Constant))

		case elf.STT_OBJECT:
			// LLVM 9 emits OBJECT-LOCAL symbols for anonymous constants.
			if bind != elf.STB_GLOBAL && bind != elf.STB_LOCAL && bind != elf.STB_WEAK {
				return fmt.Errorf("direct load: %s: %w: %s", name, errUnsupportedBinding, bind)
			}

			offset = uint32(rel.Value)

		case elf.STT_NOTYPE:
			// LLVM 7 emits NOTYPE-LOCAL symbols for anonymous constants.
			if bind != elf.STB_LOCAL {
				return fmt.Errorf("direct load: %s: %w: %s", name, errUnsupportedBinding, bind)
			}

			offset = uint32(rel.Value)

		default:
			return fmt.Errorf("incorrect relocation type %v for direct map load", typ)
		}

		// We rely on using the name of the data section as the reference. It
		// would be nicer to keep the real name in case of an STT_OBJECT, but
		// it's not clear how to encode that into Instruction.
		name = target.Name

		// The kernel expects the offset in the second basic BPF instruction.
		ins.Constant = int64(uint64(offset) << 32)
		ins.Src = asm.PseudoMapValue
```

对于d1 , 也有同样的修改, map id是6,offset为4.
```
       3:       18 02 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r2 = 0x0 ll
                0000000000000018:  R_BPF_64_64  d1
       5:       61 20 00 00 00 00 00 00 r0 = *(u32 *)(r2 + 0x0)  //d1的size是4, 所以读取3个字节
```
变为
```
; int re = c1 + d1 + cc1;
   3: (18) r2 = map[id:6][0]+4
       18 22 00 00 06 00 00 00 00 00 00 00 04 00 00 00
```

字节码里的map id 为6, 这个只有在map先加载成功生成id后,再修改prog的字节码  
llvm还会生成对应的btf信息, 但可以看到.data 和 .rodata里的size, 和各自变量的offset 都是0, 这些信息都是不正确的. 
在`fixupDatasec`里修复, 其实通过`.rel.BTF`里的重定向项也能修复. 但go-ebpf直接选择通过每个变量的size和顺序直接
推导.

``` bash
[root@localhost test-c]# bpftool btf dump  file test.o
[1] PTR '(anon)' type_id=0
[2] FUNC_PROTO '(anon)' ret_type_id=3 vlen=1
        'ctx' type_id=1
[3] INT 'int' size=4 bits_offset=0 nr_bits=32 encoding=SIGNED
[4] FUNC 'hello' type_id=2 linkage=global
[5] VOLATILE '(anon)' type_id=6
[6] INT 'char' size=1 bits_offset=0 nr_bits=8 encoding=SIGNED
[7] VAR 'c1' type_id=5, linkage=global
[8] VOLATILE '(anon)' type_id=3
[9] VAR 'd1' type_id=8, linkage=global
[10] CONST '(anon)' type_id=5
[11] VAR 'cc1' type_id=10, linkage=global
[12] DATASEC '.data' size=0 vlen=2
        type_id=7 offset=0 size=1 (VAR 'c1')
        type_id=9 offset=0 size=4 (VAR 'd1')
[13] DATASEC '.rodata' size=0 vlen=1
        type_id=11 offset=0 size=1 (VAR 'cc1')
```
如下 静态变量 s2, 重定向项是 .data, 类型是section, 这种情况真实的偏移值存在字节码里. 

``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>

volatile char s1 = 1;
static volatile char s2 = 2;

SEC("kprobe/test")
int hello(void *ctx) {
    int re = s1 + s2;
    return re;
}
```
``` bash
[root@localhost test-c]# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000000:  R_BPF_64_64  s1
       2:       71 11 00 00 00 00 00 00 r1 = *(u8 *)(r1 + 0x0)
       3:       67 01 00 00 38 00 00 00 r1 <<= 0x38
       4:       c7 01 00 00 38 00 00 00 r1 s>>= 0x38
       5:       18 02 00 00 01 00 00 00 00 00 00 00 00 00 00 00 r2 = 0x1 ll
                0000000000000028:  R_BPF_64_64  .data
       7:       71 20 00 00 00 00 00 00 r0 = *(u8 *)(r2 + 0x0)
       8:       67 00 00 00 38 00 00 00 r0 <<= 0x38
       9:       c7 00 00 00 38 00 00 00 r0 s>>= 0x38
      10:       0f 10 00 00 00 00 00 00 r0 += r1
      11:       95 00 00 00 00 00 00 00 exit
[root@localhost test-c]# llvm-readelf -s test.o

Symbol table '.symtab' contains 12 entries:
   Num:    Value          Size Type    Bind   Vis       Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT   UND
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT   ABS test.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT     3 kprobe/test
     3: 0000000000000001     1 OBJECT  LOCAL  DEFAULT     5 s2
     4: 0000000000000000     0 SECTION LOCAL  DEFAULT     5 .data
     5: 0000000000000000     0 SECTION LOCAL  DEFAULT     6 .debug_loc
     6: 0000000000000000     0 SECTION LOCAL  DEFAULT     7 .debug_abbrev
     7: 0000000000000000     0 SECTION LOCAL  DEFAULT    10 .debug_str
     8: 0000000000000000     0 SECTION LOCAL  DEFAULT    15 .debug_frame
     9: 0000000000000000     0 SECTION LOCAL  DEFAULT    17 .debug_line
    10: 0000000000000000    96 FUNC    GLOBAL DEFAULT     3 hello
    11: 0000000000000000     1 OBJECT  GLOBAL DEFAULT     5 s1
[root@localhost test-c]# rm -rf /sys/fs/bpf/test
[root@localhost test-c]# bpftool prog load test.o /sys/fs/bpf/test
[root@localhost test-c]# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; int re = s1 + s2;
   0: (18) r1 = map[id:11][0]+0
       18 21 00 00 0b 00 00 00 00 00 00 00 00 00 00 00
   2: (71) r1 = *(u8 *)(r1 +0)
       71 11 00 00 00 00 00 00
   3: (67) r1 <<= 56
       67 01 00 00 38 00 00 00
   4: (c7) r1 s>>= 56
       c7 01 00 00 38 00 00 00
; int re = s1 + s2;
   5: (18) r2 = map[id:11][0]+1
       18 22 00 00 0b 00 00 00 00 00 00 00 01 00 00 00
   7: (71) r0 = *(u8 *)(r2 +0)
       71 20 00 00 00 00 00 00
   8: (67) r0 <<= 56
       67 00 00 00 38 00 00 00
   9: (c7) r0 s>>= 56
       c7 00 00 00 38 00 00 00
; int re = s1 + s2;
  10: (0f) r0 += r1
       0f 10 00 00 00 00 00 00
; return re;
  11: (95) exit
       95 00 00 00 00 00 00 00
```
加载代码处理如下:
``` go
		case elf.STT_SECTION:
			if bind != elf.STB_LOCAL {
				return fmt.Errorf("direct load: %s: %w: %s", name, errUnsupportedBinding, bind)
			}

			// This is really a reference to a static symbol, which clang doesn't
			// emit a symbol table entry for. Instead it encodes the offset in
			// the instruction itself.
			offset = uint32(uint64(ins.Constant))
```

## kconfig的实现

使用如下代码演示
``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>

extern int CONFIG_HZ __kconfig;

SEC("kprobe/test")
int hello(void *ctx) {
    return CONFIG_HZ;
}
```
从符号表看到列 Ndx 显示 UND, 即这个符号不存在已知的section里, 所以跟全局变量的实现不一样. 它不
存在`.data`, `.rodata`这些section里
```
[root@localhost test-c]# llvm-readelf -s test.o

Symbol table '.symtab' contains 9 entries:
   Num:    Value          Size Type    Bind   Vis       Ndx Name
     0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT   UND
     1: 0000000000000000     0 FILE    LOCAL  DEFAULT   ABS test.c
     2: 0000000000000000     0 SECTION LOCAL  DEFAULT     3 kprobe/test
     3: 0000000000000000     0 SECTION LOCAL  DEFAULT     5 .debug_abbrev
     4: 0000000000000000     0 SECTION LOCAL  DEFAULT     8 .debug_str
     5: 0000000000000000     0 SECTION LOCAL  DEFAULT    13 .debug_frame
     6: 0000000000000000     0 SECTION LOCAL  DEFAULT    15 .debug_line
     7: 0000000000000000    32 FUNC    GLOBAL DEFAULT     3 hello
     8: 0000000000000000     0 NOTYPE  GLOBAL DEFAULT   UND CONFIG_HZ
```
首先从test.o里提取btf信息, 如果有`.kconfig`的 datasec, 则创建一个名为.kconfig的array map
```
[root@localhost test-c]# bpftool btf dump file test.o
[1] PTR '(anon)' type_id=0
[2] FUNC_PROTO '(anon)' ret_type_id=3 vlen=1
        'ctx' type_id=1
[3] INT 'int' size=4 bits_offset=0 nr_bits=32 encoding=SIGNED
[4] FUNC 'hello' type_id=2 linkage=global
[5] VAR 'CONFIG_HZ' type_id=3, linkage=extern
[6] DATASEC '.kconfig' size=0 vlen=1
        type_id=5 offset=0 size=4 (VAR 'CONFIG_HZ')
```
利用btf里VAR 变量的offset做重定向. 和全局变量一样,也是通过 map-ptr + offset 来寻址.  
map里的值无法从elf文件里获取, 也没有必要. 执行`resolveKconfig`这个函数在目标主机上寻找/boot/configXXx 等文件获取
实际值并填充到map里.
从实际加载后的结果看, 确实.kconfig是一个map
``` bash
[root@localhost test-c]# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; return CONFIG_HZ;
   0: (18) r1 = map[id:14][0]+0
       18 21 00 00 0e 00 00 00 00 00 00 00 00 00 00 00
; return CONFIG_HZ;
   2: (61) r0 = *(u32 *)(r1 +0)
       61 10 00 00 00 00 00 00
   3: (95) exit
       95 00 00 00 00 00 00 00
[root@localhost test-c]# bpftool map dump id 14
[{
        "value": {
            ".kconfig": [{
                    "CONFIG_HZ": 1000
                }
            ]
        }
    }
]
```
## ksym的实现
使用以下代码说明 ksym
``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>


extern void init_net __ksym;

SEC("kprobe/test")
int hello(void *ctx) {
	if (&init_net == 1) {
		return 1;
	}
	return 0;
}
```

``` bash
llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       b7 00 00 00 01 00 00 00 r0 = 0x1
       1:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000008:  R_BPF_64_64  init_net
       3:       15 01 01 00 01 00 00 00 if r1 == 0x1 goto +0x1 <LBB0_2>
       4:       b7 00 00 00 00 00 00 00 r0 = 0x0

0000000000000028 <LBB0_2>:
       5:       95 00 00 00 00 00 00 00 exit
```

``` bash
# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       b7 00 00 00 01 00 00 00 r0 = 0x1
       1:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll
                0000000000000008:  R_BPF_64_64  init_net
       3:       15 01 01 00 01 00 00 00 if r1 == 0x1 goto +0x1 <LBB0_2>
       4:       b7 00 00 00 00 00 00 00 r0 = 0x0

0000000000000028 <LBB0_2>:
       5:       95 00 00 00 00 00 00 00 exit
```
``` bash
# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; int hello(void *ctx) {
   0: (b7) r0 = 1
       b7 00 00 00 01 00 00 00
;
   1: (18) r1 = 0xffffffffa13e81c0
       18 01 00 00 c0 81 3e a1 00 00 00 00 ff ff ff ff
   3: (15) if r1 == 0x1 goto pc+1
       15 01 01 00 01 00 00 00
   4: (b7) r0 = 0
       b7 00 00 00 00 00 00 00
; }
   5: (95) exit
       95 00 00 00 00 00 00 00
```
可以看到loader将
```
        1:       18 01 00 00 00 00 00 00 00 00 00 00 00 00 00 00 r1 = 0x0 ll 
```
修改为 init_net的在目标主机上的真实地址.
```
   1: (18) r1 = 0xffffffffa13e81c0
       18 01 00 00 c0 81 3e a1 00 00 00 00 ff ff ff ff
```
在`resolveKsymReferences`里寻找在目标主机上变量的真实地址



## bpf help 函数实现
使用以下代码说明
``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>

SEC("kprobe/test")
int hello(void *ctx) {
    return bpf_get_smp_processor_id();
}
```
可以看到`85 00 00 00 08 00 00 00 call 0x8` 变为 `85 00 00 00 90 30 03 00`
这不是loader修改的, 而且加载到kernel后校验器修改的.
``` bash
[root@localhost test-c]# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       85 00 00 00 08 00 00 00 call 0x8
       1:       95 00 00 00 00 00 00 00 exit
[root@localhost test-c]# bpftool prog load test.o /sys/fs/bpf/test
[root@localhost test-c]# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; return bpf_get_smp_processor_id();
   0: (85) call bpf_get_smp_processor_id#209040
       85 00 00 00 90 30 03 00
; return bpf_get_smp_processor_id();
   1: (95) exit
       95 00 00 00 00 00 00 00
```

## bpf-call-bpf 实现

用以下代码说明
``` c

#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>
#include <bpf_core_read.h>


int __noinline test() {
    return bpf_get_smp_processor_id();
}

SEC("kprobe/test")
int hello(void *ctx) {
    return test();
}
```

下面的`85 10 00 00 ff ff ff ff`里的 10 表示源寄存器R1 , 意思就是PseudoCall 即bpf call
这个在刚解析elf文件时,并无法确定test的地址, 只有在加载到内核前的最后一步才能确认, 才会修改
字节码的后四个字节
``` bash
[root@localhost test-c]# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section .text:

0000000000000000 <test>:
       0:       85 00 00 00 08 00 00 00 call 0x8
       1:       95 00 00 00 00 00 00 00 exit

Disassembly of section kprobe/test:

0000000000000000 <hello>:
       0:       85 10 00 00 ff ff ff ff call -0x1
                0000000000000000:  R_BPF_64_32  test
       1:       95 00 00 00 00 00 00 00 exit
```


从下面加载后的结果看, 后四个字节修改为 0x01, 也就是call pc+1的位置, 是间接寻址.
``` bash
[root@localhost test-c]# bpftool prog dump xlated name hello opcodes
int hello(void * ctx):
; return test();
   0: (85) call pc+1#0xffffffffc00ef254
       85 10 01 00 01 00 00 00
; return test();
   1: (95) exit
       95 00 00 00 00 00 00 00
int test():
; return bpf_get_smp_processor_id();
   2: (85) call bpf_get_smp_processor_id#209040
       85 00 00 00 90 30 03 00
; return bpf_get_smp_processor_id();
   3: (95) exit
       95 00 00 00 00 00 00 00
```

## kfunc 实现

用以下代码说明
``` c
#include <vmlinux.h>
#include <bpf_helpers.h>
#include <bpf_tracing.h>

char __license[] SEC("license") = "Dual MIT/GPL";
extern void bpf_task_release(struct task_struct *p) __ksym;
extern struct task_struct *bpf_task_from_pid(s32 pid) __ksym __weak;

SEC("fentry/tcp_v4_rcv")
int hello(struct pt_regs *ctx) {
	struct task_struct *p = bpf_task_from_pid(1);
	if (p == NULL) {
		return 0;
	}
	bpf_task_release(p);
	return 0;
}
```
生成的目标文件的反汇编
``` bash
[root@localhost test]# llvm-objdump -dr test.o

test.o: file format elf64-bpf

Disassembly of section fentry/tcp_v4_rcv:

0000000000000000 <hello>:
       0:       b7 01 00 00 01 00 00 00 r1 = 0x1
       1:       85 10 00 00 ff ff ff ff call -0x1
                0000000000000008:  R_BPF_64_32  bpf_task_from_pid
       2:       15 00 02 00 00 00 00 00 if r0 == 0x0 goto +0x2 <LBB0_2>
       3:       bf 01 00 00 00 00 00 00 r1 = r0
       4:       85 10 00 00 ff ff ff ff call -0x1
                0000000000000020:  R_BPF_64_32  bpf_task_release

0000000000000028 <LBB0_2>:
       5:       b7 00 00 00 00 00 00 00 r0 = 0x0
       6:       95 00 00 00 00 00 00 00 exit
```

加载后的字节指令
``` bash
[root@localhost test]# bpftool prog dump xlated name hello opcodes
int hello(struct pt_regs * ctx):
; struct task_struct *p = bpf_task_from_pid(1);
   0: (b7) r1 = 1
       b7 01 00 00 01 00 00 00
   1: (85) call bpf_task_from_pid#221808
       85 20 00 00 70 62 03 00
; if (p == NULL) {
   2: (15) if r0 == 0x0 goto pc+2
       15 00 02 00 00 00 00 00
; bpf_task_release(p);
   3: (bf) r1 = r0
       bf 01 00 00 00 00 00 00
   4: (85) call bpf_task_release#221024
       85 20 00 00 60 5f 03 00
; }
   5: (b7) r0 = 0
       b7 00 00 00 00 00 00 00
   6: (95) exit
       95 00 00 00 00 00 00 00
```

目标文件里的`85 10 00 00 ff ff ff ff`, 经过加载后,被修改为 `85 20 00 00 70 62 03 00`
20里的 2 代表是 kfunc, `70 62 03 00` 即为 0x036270, 即从`__bpf_call_base`地址偏移
0x036270就是要执行的函数地址. 

```
[root@localhost test]# grep " __bpf_call_base" /proc/kallsyms
ffffffffaeca4cc0 T __bpf_call_base
[root@localhost test]# grep " bpf_task_from_pid" /proc/kallsyms
ffffffffaecdaf30 T bpf_task_from_pid
[root@localhost test]# python
Python 3.9.9 (main, Nov 22 2021, 00:00:00)
[GCC 11.2.1 20211019 (Red Hat 11.2.1-6)] on linux
Type "help", "copyright", "credits" or "license" for more information.
>>> hex(0xffffffffaecdaf30 - 0xffffffffaeca4cc0)
'0x36270'
>>> exit()
```

## bpf verify的实现

### 基本流程
```
bpf_check
    -> check_btf_info_early
    -> add_subprog_and_kfunc
    -> check_subprogs
    -> check_btf_info
    -> resolve_pseudo_ldimm64
    -> check_cfg
    -> do_check_main
    -> optimize_bpf_loop
    -> opt_hard_wire_dead_code_branches
    -> opt_remove_dead_code
    -> opt_remove_nops
    -> sanitize_dead_code
    -> convert_ctx_accesses
    -> do_misc_fixups
```
### 日志解释

### 分支校验

### call校验

### exit校验

### ctx转换

### x86 jit介绍