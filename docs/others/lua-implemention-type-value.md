---
title: "Lua实现原理 - 类型与值"
author: "Peter Wang"
tags: ["Lua", "c"]
date: 2020-09-27T21:17:14+08:00
draft: false
---

Lua是巴西人发明的脚本语言,作者称之为穿过针孔的语言.体积非常小巧(Lua 5.3.1在Linux下编译后仅为546K),同时功能很强大(支持闭包,协程等).  
本文主要介绍它的值实现方式  

<!--more-->
Lua的虚拟机自5.0后是虚拟机运行是基于寄存器的.其他大部分解释性语言都是基于栈的(Python,Java).Lua全部采用C语言编写,可在多个平台下编译通过.作为一个嵌入式的语言,常作为大型程序的插件使用(比如Wireshark,Redis).  
Lua和其他解释性语言一样,先将原文件编译为字节码.即一种虚拟机可"读懂"的数据形式.然后虚拟机循环读取每个字节码,并执行相应的操作.  
文中所有代码都指Lua 5.3.1,OS环境为CentOS7,同时例子中的代码做了增减,将宏展开或者删除掉一些与所讲内容关系不大的代码.  

值与类型
在Lua里的总共实现了9种类型,具体如下：

| 类型           | 含义     |
| :------------ |:---------|
| nil           | 代表一个值不存在  |
| boolean       | 代表逻辑判断的结果 包括true,false两个值  |
| number        | 代表数字，可以是整数,也可以是浮点数.  |
| lightuserdata | 代表轻型用户数据，它简单地指向一个C指针|
| userdata      | 代表完全用户数据，它可以通过元表定义许多操作.  |
| string        | 代表字符串  |
| table         | 代表hash表和列表， 这块Lua设计得相当取巧,用一种类型同时支持Python里的dict(表示键值对)和Python里的list(数组).|
| function      | 代表Lua和C语言里的函数  |
| thread        | 代表Lua内部实现的协程。 它并不是OS的原生线程, 它代表了一组执行序列. 虚拟机的字节码执行就是在它的栈上  |

在解释性语言里, 值的实现上是自带类型的. 例如 `a = 10` 这样的语句表示将number类型的值为10的对象绑定到a上.  与C这种静态语言不同，变量名只是一个名字, 它可以通过`=`和任意类型的对象绑定。  
如下是Lua中对象的结构定义. 所有对象都用这个结构体表示. 
``` c
typedef struct lua_TValue {
  Value value_; 
  int tt_;
} TValue; 
union Value {
  GCObject *gc;    /* collectable objects */
  void *p;         /* light userdata */
  int b;           /* booleans */
  lua_CFunction f; /* light C functions */
  lua_Integer i;   /* integer numbers */
  lua_Number n;    /* float numbers */
};
/* 使用 union 可以节省空间,因为这几个字段不可能同时有效 */
```
其中`tt_`字段包含了类型信息. 低位0到3代表了类型. 4,5位则对类型细分. 比如字符串里又分为短字符串和长字符串. 比如function这个类型可分为c函数, Lua闭包和C闭包. 他们各自的调用方式或者行为都不同, 这样做的目的是可以进一步做优化.  
第6位表示该值是否由GC管理. 用户数据,boolean,c function,整数或者浮点数可以直接表示, 其他如string, table需要GC管理. 相比Python下是所有的类型都受GC管理, Lua则做了优化.这样GC压力小,自然性能好.

``` c
/*
** basic types
*/
#define LUA_TNIL		0
#define LUA_TBOOLEAN		1
#define LUA_TLIGHTUSERDATA	2
#define LUA_TNUMBER		3
#define LUA_TSTRING		4
#define LUA_TTABLE		5
#define LUA_TFUNCTION		6
#define LUA_TUSERDATA		7
#define LUA_TTHREAD		8

/*
** tags for Tagged Values have the following use of bits:
** bits 0-3: actual tag (a LUA_T* value)
** bits 4-5: variant bits
** bit 6: whether value is collectable
*/
/*
** LUA_TFUNCTION variants:
** 0 - Lua function
** 1 - light C function
** 2 - regular C function (closure)
*/
/* Variant tags for functions */
#define LUA_TLCL	(LUA_TFUNCTION | (0 << 4))  /* Lua closure */
#define LUA_TLCF	(LUA_TFUNCTION | (1 << 4))  /* light C function */
#define LUA_TCCL	(LUA_TFUNCTION | (2 << 4))  /* C closure */
/* Variant tags for strings */
#define LUA_TSHRSTR	(LUA_TSTRING | (0 << 4))  /* short strings */
#define LUA_TLNGSTR	(LUA_TSTRING | (1 << 4))  /* long strings */
/* Variant tags for numbers */
#define LUA_TNUMFLT	(LUA_TNUMBER | (0 << 4))  /* float numbers */
#define LUA_TNUMINT	(LUA_TNUMBER | (1 << 4))  /* integer numbers */
/* Bit mark for collectable types */
#define BIT_ISCOLLECTABLE	(1 << 6)
```

`TValue`通过字段`tt_`字段可知道其型, 如果是`booleans`, 则直接取`TValue.b`. 如果是`light c function`,则取`TValue.f`. 如果是GC管理的对象, 则需要通过如下宏将类型为GCObject指针显性转换为相应类型的指针. 比如字符串的结构为`struct TString`,  当前有个`TValue`的指针p.  通过`p->tt_`判断该值是字符串, 则`GCUnion*(p->value_.gc)->ts` 则可以得到一个指向 struct TString结构的指针. 当然也可以将新生成的`struct TString`结构的指针转换为`GCObject`结构的指针, 放入`TValue`

``` c
** Common Header for all collectable objects (in macro form, to be
** included in other objects)
*/
#define CommonHeader	GCObject *next; lu_byte tt; lu_byte marked
/*
** Common type has only the common header
*/
typedef struct GCObject {
  CommonHeader;
} GCObject;
/*
** Union of all collectable objects (only for conversions)
*/
union GCUnion {
  GCObject gc;  /* common header */
  struct TString ts;
  struct Udata u;
  union Closure cl;
  struct Table h;
  struct Proto p;
  struct lua_State th;  /* thread */
};
#define cast(t, exp)	((t)(exp))
#define cast_u(o)	cast(union GCUnion *, (o))

/* macros to convert a GCObject into a specific value */
#define gco2ts(o)  \
	check_exp(novariant((o)->tt) == LUA_TSTRING, &((cast_u(o))->ts))
   
/* macro to convert a Lua object into a GCObject */
#define obj2gco(v) \
	check_exp(novariant((v)->tt) < LUA_TDEADKEY, (&(cast_u(v)->gc)))
```
    
    
    


字符串在Lua里也是zero-terminated的. 所以可以利用c标准库的各种字符串操作函数. 
``` c
/*
** Header for string value; string bytes follow the end of this structure
** (aligned according to 'UTString'; see next).
*/
#define CommonHeader	GCObject *next; lu_byte tt; lu_byte marked
typedef struct TString {
  CommonHeader;
  lu_byte extra;  /* reserved words for short strings; "has hash" for longs */
  lu_byte shrlen;  /* length for short strings */
  unsigned int hash;
  union {
    size_t lnglen;  /* length for long strings */
    struct TString *hnext;  /* linked list for hash table */
  } u;
} TString;
/*
** Ensures that address after this type is always fully aligned.
*/
typedef union UTString {
  L_Umaxalign dummy;  /* ensures maximum alignment for strings */
  TString tsv;
} UTString;
```

字符串长度有专门的字段. 这样取长度时就很快. 不用再计算. 如下代码可以看到,真正储存字符的数据并不是紧跟在struct TString后. 这是为了保证指向第一个字符的指针是对齐的. 参见上面的结构体 union UTString

``` c
#define cast(t, exp)	((t)(exp))
/*
** Get the actual string (array of bytes) from a 'TString'.
** (Access to 'extra' ensures that value is really a 'TString'.)
*/
#define getaddrstr(ts)	(cast(char *, (ts)) + sizeof(UTString))
#define getstr(ts)  \
  check_exp(sizeof((ts)->extra), cast(const char*, getaddrstr(ts)))
/*
** creates a new string object
*/
static TString *createstrobj (lua_State *L, const char *str, size_t l,
                              int tag, unsigned int h) {
  TString *ts;
  GCObject *o;
  size_t totalsize;  /* total size of TString object */
  totalsize = sizelstring(l);
  o = luaC_newobj(L, tag, totalsize);
  ts = gco2ts(o);
  ts->hash = h;
  ts->extra = 0;
  memcpy(getaddrstr(ts), str, l * sizeof(char));
  getaddrstr(ts)[l] = '\0';  /* ending 0 */
  return ts;
}
```

这里Lua对短字符做了优化处理. 如果需要生成的字符串长度小于或者等于40(可在编译时调整), 则该字符串属于短字符串.Lua里所有的短字符串都保存在一个基于链表的哈希表里. 这样当新创建一个短字符串时,先检查该表有没有.有就直接利用,返回表中的字符指针. 没有则新建并放入该哈希表. 
新的short string因为要放入到哈希表里,所以顺带hash过了. long string在新建时为加速并没有立即hash. 等以后有需要时再计算
判断两个字符串是否相等时,则很简单:
一个short,一个long则不同. 
都是short时,直接比指针地址即可(因为所有short string在系统中只存在一份)
都是long时,则对比长度, 先用memcmp比较

``` c
/*
** new string (with explicit length)
*/
TString *luaS_newlstr (lua_State *L, const char *str, size_t l) {
  if (l <= LUAI_MAXSHORTLEN)  /* short string? */
    return internshrstr(L, str, l);
  else {
    TString *ts;
    if (l + 1 > (MAX_SIZE - sizeof(TString))/sizeof(char))
      luaM_toobig(L);
    ts = createstrobj(L, str, l, LUA_TLNGSTR, G(L)->seed);
    ts->u.lnglen = l;
    return ts;
  }
}
```


hash计算时需要seed.  当进程运行时,会生成如下的运算生成一个随机数作为种子. 该值会赋给g->seed. 在新建状态机时产生. 整个运行过程中不会再改变
 
``` c
#include <time.h>
#define luai_makeseed()		cast(unsigned int, time(NULL))
/*
** Compute an initial seed as random as possible. Rely on Address Space
** Layout Randomization (if present) to increase randomness..
*/
#define addbuff(b,p,e) \
  { size_t t = cast(size_t, e); \
    memcpy(buff + p, &t, sizeof(t)); p += sizeof(t); }

static unsigned int makeseed (lua_State *L) {
  char buff[4 * sizeof(size_t)];
  unsigned int h = luai_makeseed();
  int p = 0;
  addbuff(buff, p, L);  /* heap variable */
  addbuff(buff, p, &h);  /* local variable */
  addbuff(buff, p, luaO_nilobject);  /* global variable */
  addbuff(buff, p, &lua_newstate);  /* public function */
  lua_assert(p == sizeof(buff));
  return luaS_hash(buff, p, h);
}

unsigned int luaS_hash (const char *str, size_t l, unsigned int seed) {
  unsigned int h = seed ^ cast(unsigned int, l);
  size_t l1;
  size_t step = (l >> LUAI_HASHLIMIT) + 1;
  for (l1 = l; l1 >= step; l1 -= step)
    h = h ^ ((h<<5) + (h>>2) + cast_byte(str[l1 - 1]));
  return h;
}
```
可以看到对string做hash计算时, 并没有对每个字符进行计算, 至多会对其中的 2^5 个字符进行计算
``` c
unsigned int luaS_hash (const char *str, size_t l, unsigned int seed) {
  unsigned int h = seed ^ cast(unsigned int, l);
  size_t l1;
  size_t step = (l >> LUAI_HASHLIMIT) + 1;       /* LUAI_HASHLIMIT 默认是 5 */
  for (l1 = l; l1 >= step; l1 -= step)
    h = h ^ ((h<<5) + (h>>2) + cast_byte(str[l1 - 1]));
  return h;
}
```

init和bool类型,包括指针(可转换为整数)直接使用值为hash值



Lua中的table不仅支持键值对这样的结构,还支持以索引值来访问的数组. 可以说将两者合二为1. 少了一个数据结构,但功能上仍一样.
哈希表主要是基于开放地址, 这样所有数据都在连续排在一起, 避免内存碎化. 内存效率高