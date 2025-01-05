
经常看一些文章说`amd64`架构下C语言函数调用时,第一个参数的值在寄存器`RDI`里, 第二个参数的值在寄存器`RSI`里, 但其实并不全完对,
因为这段话需要加一些限制条件. 例外情况比如参数本身的大小超过16个字节的话,是会放到栈上面,而不是寄存器. 那到底参数传值的所有规则是什么?
如果放在栈上面,又是怎么排列顺序? 经过查询相关的资料和亲自试验, 本文总结了`amd64`和`aarch64`两种架构下函数调用的细节.

<!--more-->
## amd64 函数调用规约

1. `RDI` `RSI` `RDX` `RCX` `R8` `R9`  这6个寄存器可用于存放参数, 依次使用
2. `参数的size <= 8`, 可以使用上面的寄存器传值
3. `8 < 参数的size` <= 16 且 上面的寄存器有两个空闲的寄存器未被使用, 则使用寄存器传值
4. 其他入参情况,全部利用栈空间分配一块区域(8字节对齐),用于传值.  且从右到左, 依次将参数的值压入栈中.
5. `返回值的size <= 8`, 放入 `RAX`
6. `8 < 返回值的size <= 16`, 放入 `RAX` 和 `RDX`
7. 其他返回值, 放入栈中, 指向栈的内存地址在函数开始执行时,放入`RDI`里(这时入参从`RSI`开始), 在函数结束返回时放入`RAX`.
>提示: 内核代码中, 目前没发现函数返回值大于16个字节的情况


通过下面的代码来详细分析
``` c

struct size16 {
  unsigned long long a;
  unsigned long long b;
};

struct size24 {
  unsigned long long a;
  unsigned long long b;
  unsigned long long c;
};

struct size32 {
  unsigned long long a;
  unsigned long long b;
  unsigned long long c;
  unsigned long long d;
};

struct size16 test1(int p1, struct size16 p2, struct size32 p3,
                    struct size16 p4, struct size16 p5, struct size16 p6,
                    struct size24 p7, char c1, char c2, struct size16 p8) {
  struct size16 ret;
  ret.a = 1;
  ret.b = 11;
  return ret;
};
struct size32 test2(int p1, struct size16 p2, struct size32 p3,
                    struct size16 p4, struct size16 p5, struct size16 p6,
                    struct size24 p7, char c1, char c2, struct size16 p8) {
  struct size32 ret;
  ret.a = 1;
  ret.b = 11;
  ret.c = 111;
  ret.d = 1111;
  return ret;
};

int main(int argc, char **argv) {

  char c1 = 1;
  char c2 = 2;

  int p1 = 1;

  struct size16 p2 = {0x2, 0x22};
  struct size16 p4 = {0x4, 0x44};
  struct size16 p5 = {0x5, 0x55};
  struct size16 p6 = {0x6, 0x66};
  struct size16 p8 = {0x8, 0x88};

  struct size24 p7 = {0x7, 0x77, 0x777};

  struct size32 p3 = {0x3, 0x33, 0x333, 0x3333};

  struct size16 ret1;
  struct size32 ret2;
  ret1 = test1(p1, p2, p3, p4, p5, p6, p7, c1, c2, p8);
  ret2 = test2(p1, p2, p3, p4, p5, p6, p7, c1, c2, p8);
  return 0;
}

```
先看`test`这个函数, 根据上述的规则,我们可以得出以下结论:
1. p1的size <= 8, 所以值放入`RDI`
2. p2的size 大于8, 小于等于16, 这个时候除了`RDI`, 其他寄存器都是空闲未分配状态. 满足2个的诉求. 所以值放入 `RSI` 和 `RDX`. 
3. 下一个未分配的寄存器是 `RCX`
4. p3的size 大于16, 不能使用寄存器, 需要把值在栈分配, 暂时先记下, 不展开讨论.  
5. p4 的值使用 `RCX` 和 `R8`
6. 现在只有一个未分配的寄存器`R9`,  p5的size 需要两个寄存器. 不满足条件,所以需要在栈上分配, 暂时先记下
7. p6 和 p5 的分配情况一样,只能在栈上分配
8. p7的size 大于16, 和p3的情况一样, 需要在栈上分配
9. c1 的值分配到 `R9`, 现在用于参数的寄存器全部已分配, 其余的 c2 p8 无论大小是多少,全部分配到栈上
10. 从右到左看, 需要将 p8, c2, p7, p6, p5, p3 的值依次压入栈中, 这里要注意分配的空间必须8字节对齐


上面的代码经过gcc编译, 然后gdb 反汇编如下,我们重点看`call   0x401106 <test1>`之前的汇编, 是真实的分配情况, 做了注释, 可以看到和上面的
理论分析结果一样.

``` asm
Dump of assembler code for function main:
39      int main(int argc, char **argv) {
   0x00000000004011c5 <+0>:     push   %rbp
   0x00000000004011c6 <+1>:     mov    %rsp,%rbp
   0x00000000004011c9 <+4>:     push   %rbx
   0x00000000004011ca <+5>:     sub    $0xe8,%rsp
   0x00000000004011d1 <+12>:    mov    %edi,-0xe4(%rbp)
   0x00000000004011d7 <+18>:    mov    %rsi,-0xf0(%rbp)

40
41        char c1 = 1;
=> 0x00000000004011de <+25>:    movb   $0x1,-0x11(%rbp)

42        char c2 = 2;
   0x00000000004011e2 <+29>:    movb   $0x2,-0x12(%rbp)

43
44        int p1 = 1;
   0x00000000004011e6 <+33>:    movl   $0x1,-0x18(%rbp)

45
46        struct size16 p2 = {0x2, 0x22};
   0x00000000004011ed <+40>:    movq   $0x2,-0x30(%rbp)
   0x00000000004011f5 <+48>:    movq   $0x22,-0x28(%rbp)

47        struct size16 p4 = {0x4, 0x44};
   0x00000000004011fd <+56>:    movq   $0x4,-0x40(%rbp)
   0x0000000000401205 <+64>:    movq   $0x44,-0x38(%rbp)

48        struct size16 p5 = {0x5, 0x55};
   0x000000000040120d <+72>:    movq   $0x5,-0x50(%rbp)
   0x0000000000401215 <+80>:    movq   $0x55,-0x48(%rbp)

49        struct size16 p6 = {0x6, 0x66};
   0x000000000040121d <+88>:    movq   $0x6,-0x60(%rbp)
   0x0000000000401225 <+96>:    movq   $0x66,-0x58(%rbp)

50        struct size16 p8 = {0x8, 0x88};
   0x000000000040122d <+104>:   movq   $0x8,-0x70(%rbp)
   0x0000000000401235 <+112>:   movq   $0x88,-0x68(%rbp)

51
52        struct size24 p7 = {0x7, 0x77, 0x777};
   0x000000000040123d <+120>:   movq   $0x7,-0x90(%rbp)
   0x0000000000401248 <+131>:   movq   $0x77,-0x88(%rbp)
   0x0000000000401253 <+142>:   movq   $0x777,-0x80(%rbp)

53
54        struct size32 p3 = {0x3, 0x33, 0x333, 0x3333};
   0x000000000040125b <+150>:   movq   $0x3,-0xb0(%rbp)
   0x0000000000401266 <+161>:   movq   $0x33,-0xa8(%rbp)
   0x0000000000401271 <+172>:   movq   $0x333,-0xa0(%rbp)
   0x000000000040127c <+183>:   movq   $0x3333,-0x98(%rbp)

55
56        struct size16 ret1;
57        struct size32 ret2;
58        ret1 = test1(p1, p2, p3, p4, p5, p6, p7, c1, c2, p8);
   0x0000000000401287 <+194>:   movsbl -0x12(%rbp),%edi  /* c2传入edi(rdi的低32位) */
   0x000000000040128b <+198>:   movsbl -0x11(%rbp),%r9d  /* c1传入r9d(r9的低8位) */
   0x0000000000401290 <+203>:   mov    -0x40(%rbp),%rcx  /* p4(前8字节)传入rcx */
   0x0000000000401294 <+207>:   mov    -0x38(%rbp),%r8   /* p4(后8字节)传入r8 */
   0x0000000000401298 <+211>:   mov    -0x30(%rbp),%rsi  /* p2(前8字节)传入rsi */
   0x000000000040129c <+215>:   mov    -0x28(%rbp),%rdx  /* p2(后8字节)传入rdx */
   0x00000000004012a0 <+219>:   mov    -0x18(%rbp),%eax  /* p1传入eax */
   0x00000000004012a3 <+222>:   push   -0x68(%rbp)       
   0x00000000004012a6 <+225>:   push   -0x70(%rbp)       /* p8压入栈 */
   0x00000000004012a9 <+228>:   push   %rdi              /* c2压入栈, 使用64位寄存器rdi,确保8字节对齐 */
   0x00000000004012aa <+229>:   push   -0x80(%rbp)
   0x00000000004012ad <+232>:   push   -0x88(%rbp)
   0x00000000004012b3 <+238>:   push   -0x90(%rbp)       /* p7压入栈 */
   0x00000000004012b9 <+244>:   push   -0x58(%rbp)
   0x00000000004012bc <+247>:   push   -0x60(%rbp)       /* p6压入栈 */
   0x00000000004012bf <+250>:   push   -0x48(%rbp)
   0x00000000004012c2 <+253>:   push   -0x50(%rbp)       /* p5压入栈 */
   0x00000000004012c5 <+256>:   push   -0x98(%rbp)
   0x00000000004012cb <+262>:   push   -0xa0(%rbp)
   0x00000000004012d1 <+268>:   push   -0xa8(%rbp)
   0x00000000004012d7 <+274>:   push   -0xb0(%rbp)       /* p3压入栈 */
   0x00000000004012dd <+280>:   mov    %eax,%edi         /* eax传入edi, 即p1的值传入edi(rdi的低32位) */
   0x00000000004012df <+282>:   call   0x401106 <test1>
   0x00000000004012e4 <+287>:   add    $0x70,%rsp
   0x00000000004012e8 <+291>:   mov    %rax,-0xc0(%rbp)
   0x00000000004012ef <+298>:   mov    %rdx,-0xb8(%rbp)

59        ret2 = test2(p1, p2, p3, p4, p5, p6, p7, c1, c2, p8);
   0x00000000004012f6 <+305>:   movsbl -0x12(%rbp),%r9d
   0x00000000004012fb <+310>:   movsbl -0x11(%rbp),%r8d
   0x0000000000401300 <+315>:   lea    -0xe0(%rbp),%rdi
   0x0000000000401307 <+322>:   mov    -0x40(%rbp),%rcx
   0x000000000040130b <+326>:   mov    -0x38(%rbp),%rbx
   0x000000000040130f <+330>:   mov    -0x30(%rbp),%rax
   0x0000000000401313 <+334>:   mov    -0x28(%rbp),%rdx
   0x0000000000401317 <+338>:   mov    -0x18(%rbp),%esi
   0x000000000040131a <+341>:   sub    $0x8,%rsp
   0x000000000040131e <+345>:   push   -0x68(%rbp)
   0x0000000000401321 <+348>:   push   -0x70(%rbp)
   0x0000000000401324 <+351>:   push   %r9
   0x0000000000401326 <+353>:   push   %r8
   0x0000000000401328 <+355>:   push   -0x80(%rbp)
   0x000000000040132b <+358>:   push   -0x88(%rbp)
   0x0000000000401331 <+364>:   push   -0x90(%rbp)
   0x0000000000401337 <+370>:   push   -0x58(%rbp)
   0x000000000040133a <+373>:   push   -0x60(%rbp)
   0x000000000040133d <+376>:   push   -0x48(%rbp)
   0x0000000000401340 <+379>:   push   -0x50(%rbp)
   0x0000000000401343 <+382>:   push   -0x98(%rbp)
   0x0000000000401349 <+388>:   push   -0xa0(%rbp)
   0x000000000040134f <+394>:   push   -0xa8(%rbp)
   0x0000000000401355 <+400>:   push   -0xb0(%rbp)
   0x000000000040135b <+406>:   mov    %rcx,%r8
   0x000000000040135e <+409>:   mov    %rbx,%r9
   0x0000000000401361 <+412>:   mov    %rdx,%rcx
   0x0000000000401364 <+415>:   mov    %rax,%rdx
   0x0000000000401367 <+418>:   call   0x401155 <test2>
   0x000000000040136c <+423>:   sub    $0xffffffffffffff80,%rsp

60        return 0;
   0x0000000000401370 <+427>:   mov    $0x0,%eax

61      }
   0x0000000000401375 <+432>:   mov    -0x8(%rbp),%rbx
   0x0000000000401379 <+436>:   leave
   0x000000000040137a <+437>:   ret

End of assembler dump.
```


继续分析返回值的情况,从规则上看
1. test1的返回值应该放在 `RAX` 和 `RDX`
2. 指向test2的返回值的内存地址,放在 `RAX`
通过反汇编`test1`和`test2`函数,确实是这样, 部分关键环节加了注释.
``` asm
Dump of assembler code for function test1:
22                          struct size24 p7, char c1, char c2, struct size16 p8) {
   0x0000000000401106 <+0>:     push   %rbp
   0x0000000000401107 <+1>:     mov    %rsp,%rbp
   0x000000000040110a <+4>:     mov    %edi,-0x14(%rbp)
   0x000000000040110d <+7>:     mov    %rsi,%rax
   0x0000000000401110 <+10>:    mov    %rdx,%rsi
   0x0000000000401113 <+13>:    mov    %rsi,%rdx
   0x0000000000401116 <+16>:    mov    %rax,-0x30(%rbp)
   0x000000000040111a <+20>:    mov    %rdx,-0x28(%rbp)
   0x000000000040111e <+24>:    mov    %rcx,%rax
   0x0000000000401121 <+27>:    mov    %r8,%rcx
   0x0000000000401124 <+30>:    mov    %rcx,%rdx
   0x0000000000401127 <+33>:    mov    %rax,-0x40(%rbp)
   0x000000000040112b <+37>:    mov    %rdx,-0x38(%rbp)
   0x000000000040112f <+41>:    mov    %r9d,%edx
   0x0000000000401132 <+44>:    mov    0x68(%rbp),%eax
   0x0000000000401135 <+47>:    mov    %dl,-0x18(%rbp)
   0x0000000000401138 <+50>:    mov    %al,-0x1c(%rbp)

23        struct size16 ret;
24        ret.a = 1;
   0x000000000040113b <+53>:    movq   $0x1,-0x10(%rbp)

25        ret.b = 11;
   0x0000000000401143 <+61>:    movq   $0xb,-0x8(%rbp)

26        return ret;
   0x000000000040114b <+69>:    mov    -0x10(%rbp),%rax  /* 返回值的高位存入rax */
   0x000000000040114f <+73>:    mov    -0x8(%rbp),%rdx   /* 返回值的低位存入rdx */

27      };
   0x0000000000401153 <+77>:    pop    %rbp
   0x0000000000401154 <+78>:    ret

End of assembler dump.
```
``` asm
Dump of assembler code for function test2:
30                          struct size24 p7, char c1, char c2, struct size16 p8) {
   0x0000000000401155 <+0>:     push   %rbp
   0x0000000000401156 <+1>:     mov    %rsp,%rbp
   0x0000000000401159 <+4>:     mov    %rdi,-0x28(%rbp)  /* 指向返回值的内存地址从`RDI`拷贝到 -0x28(%rbp)*/
   0x000000000040115d <+8>:     mov    %esi,-0x2c(%rbp)
   0x0000000000401160 <+11>:    mov    %rdx,-0x40(%rbp)
   0x0000000000401164 <+15>:    mov    %rcx,-0x38(%rbp)
   0x0000000000401168 <+19>:    mov    %r8,-0x50(%rbp)
   0x000000000040116c <+23>:    mov    %r9,-0x48(%rbp)
   0x0000000000401170 <+27>:    mov    0x68(%rbp),%edx
   0x0000000000401173 <+30>:    mov    0x70(%rbp),%eax
   0x0000000000401176 <+33>:    mov    %dl,-0x30(%rbp)
   0x0000000000401179 <+36>:    mov    %al,-0x54(%rbp)

31        struct size32 ret;
32        ret.a = 1;
   0x000000000040117c <+39>:    movq   $0x1,-0x20(%rbp)

33        ret.b = 11;
   0x0000000000401184 <+47>:    movq   $0xb,-0x18(%rbp)

34        ret.c = 111;
   0x000000000040118c <+55>:    movq   $0x6f,-0x10(%rbp)

35        ret.d = 1111;
   0x0000000000401194 <+63>:    movq   $0x457,-0x8(%rbp)

36        return ret;
   0x000000000040119c <+71>:    mov    -0x28(%rbp),%rcx
   0x00000000004011a0 <+75>:    mov    -0x20(%rbp),%rax
   0x00000000004011a4 <+79>:    mov    -0x18(%rbp),%rdx
   0x00000000004011a8 <+83>:    mov    %rax,(%rcx)
   0x00000000004011ab <+86>:    mov    %rdx,0x8(%rcx)
   0x00000000004011af <+90>:    mov    -0x10(%rbp),%rax
   0x00000000004011b3 <+94>:    mov    -0x8(%rbp),%rdx
   0x00000000004011b7 <+98>:    mov    %rax,0x10(%rcx)
   0x00000000004011bb <+102>:   mov    %rdx,0x18(%rcx)

37      };
   0x00000000004011bf <+106>:   mov    -0x28(%rbp),%rax   /* 指向返回值的内存地址存入rax */
   0x00000000004011c3 <+110>:   pop    %rbp
   0x00000000004011c4 <+111>:   ret

End of assembler dump.
```

## aarch64 函数调用规约

1. `X0` `X1` `X2` `X3` `X4` `X5` `X6` `X7` 这8个寄存器可用于存放参数, 依次使用
2. `参数的size <= 8`, 可以使用上面的寄存器传值
3. `8 < 参数的size` <= 16 且 上面的寄存器有两个空闲的寄存器未被使用, 则使用寄存器传值
3. `参数的size` > 16 且 有一个空闲的寄存器, 则将指向参数内容的内存地址放入该寄存器
4. 其他情况利用栈空间分配一块区域(8字节对齐),用于传值.  且从右到左, 依次将参数的值压入栈中.
	a. 如果size 小于等于16, 则把值直接压入栈中, 
	b. 如果size 大于16, 把指向值的内存地址压入栈中.
5. `返回值的size <= 8`, 放入 `X0`
6. `8 < 返回值的size <= 16`, 放入 `X0` 和 `X1`
7. 其他返回值, 放入栈中, 指向栈的内存地址在函数开始执行时,放入`X0`里(这时入参从`X1`开始), 在函数结束返回时放入`X8`.



参考资料:  
https://en.wikipedia.org/wiki/X86_calling_conventions#System_V_AMD64_ABI  
https://student.cs.uwaterloo.ca/~cs452/docs/rpi4b/aapcs64.pdf  