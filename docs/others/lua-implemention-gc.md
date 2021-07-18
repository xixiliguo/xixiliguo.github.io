---
title: "Lua实现原理 - GC垃圾回收"
author: "Peter Wang"
tags: ["Lua", "c"]
date: 2020-09-30T21:17:14+08:00
draft: false
---

Lua是巴西人发明的脚本语言,作者称之为穿过针孔的语言.体积非常小巧(Lua 5.3.1在Linux下编译后仅为546K),同时功能很强大(支持闭包,协程等).
本文主要介绍它的垃圾回收算法  

<!--more-->
通常的垃圾回收算法主要有两种, 引用计数和标记清除    
1. 引用计数主要是当对象被创建时计数为1.以后当该对象再次被引用时则计数加1.当取消引用时计数减1.这样当计数为0时则释放对象.该方法较容易理解,目前CPython是这样实现的.但该方法会遇到循环引用的问题.比如A和B都是列表,A包含B,B也同时包含A.即`A[0] = B; B[0]=A`.这样当取消引用时,A和B所引用的列表计数仍为1,即不会释放.但显然这时需要释放.CPython通过标记清除来解决循环引用的问题.  
2. 标记清除原理是从根开始扫描(通常指全局变量和栈),发现一个存活对象则mark一下.等完成扫描动作后没有mark的则为需要清除的对象.直接释放.将mark过的对象reset后为下一次GC做准备.  

Lua 5.3.1使用增量的三色标记清除的GC算法, 对象刚被创建时默认标记颜色为白色,GC具体步骤如下:  
1. 确定根部为全局变量(内部是hash table实现)和内部称之为therad的数据结构(它的一个成员指向一段连续内存,对应lua函数执行的逻辑栈)  
2. 从根开始扫描, 如果该对象内部并不引用其他对象,则直接标记为黑色.如果该对象引用了其他对象,则该对象标记为灰色并加入灰色链表里(例如 `b = 1; a["abc"] = b`即啊引用b, 此时标记a为灰色).当扫描完一遍后,检查灰色列表是否为空, 为空则调到4, 否则继续执行步骤3.这一步称之为mark  
3. 取灰色链表上一个对象,首先设置为黑色并从该链接上去除,然后按步骤2的方法mark这个对象所引用的所有对象.(这里有个例外thread的处理仍然为灰色,会放入另一个灰色链接,暂纪委grayagain), 这步称之为traverse, 循环提取对象traverse直到灰色链接表为空   
4. 检查grayagain是否为空,不为空则继续按步骤3的原则继续traverse, 直到为空.写屏障生成的灰色对象会放在grayagain里   
5. 此时没有颜色为灰色的对象, GC进入sweep阶段,系统开始把标记为黑色的转换为白色,将当前白色的对象(即未mark到的对象)全部释放掉.  
6. reset相关状态,等下一个GC的触发条件达到时候继续按步骤1进行. lua默认当前内存申请的大小为上次GC后存活的所有对象大小的2倍时启动next GC   

如果上述步骤连续一次性运行,这样会导致STW(stop the world)很长, Lua实现比较巧妙, 一次只做一点. 比如在步骤3里按每个对象的大小作为参考值.Traverse一定量后停止GC操作,继续执行Lua字节码的操作. 下次Check时继续运行, 达到一定量再次回到Lua字节码的执行. 这样STW中断时间很短,提高了程序响应时间,这是称之为增量GC的原因. 

这样GC和程序逻辑交错运行会引入一个问题,对象A是hash table在一次GC中已经标记为黑色,紧接着执行业务逻辑`A["abc"] = B`.假设B对象为白色,按因对象A已经是黑色,所有永远不会扫描到B, 则可能出现被意外释放的风险. 写屏障是用来解决这个问题的.当执行操作码`OP_SETLIST`时,为键赋新值后都要执行宏定义`LuaC_barrierback`, 当hash table 为黑, 值为白时,则将hash table由黑转为灰, 放到grayagain链表里,会在步骤4里重新traverse一遍  
也正是交错运行的原因, 已经扫描过的逻辑栈和马上要进入sweep阶段的逻辑栈肯定不一样了. 这就是thread标记为灰色,放入grayagain的原因, 在进入sweep前执行一个不可被业务逻辑打断的原子操作, 重新mark&traverse一下  

在Lua巨大的虚拟机里,当执行`OP_NEWTABLE`,`OP_CONCAT`,`OP_CLOSURE`时执行宏`checkGC(L, ra + 1)`,展开如下,主要是调用了`luaC_step`这个函数  

``` c 
#define checkGC(L,c)  \
  Protect( luaC_condGC(L,{L->top = (c);  /* limit of live values */ \
                          luaC_step(L); \
                          L->top = ci->top;})  /* restore top */ \
           luai_threadyield(L); )

/*只有当debt大于0时才正是开始执行GC,在实际运行时,此值通常小于负的一个步长, 随着新对象的创建,达到一个步长时,则启动GC */
#define luaC_condGC(L,c) \
	{if (G(L)->GCdebt > 0) {c;}; condchangemem(L);}   
#define luaC_checkGC(L)		luaC_condGC(L, luaC_step(L);)

/*
** performs a basic GC step when collector is running
*/
void luaC_step (lua_State *L) {
  global_State *g = G(L);
  l_mem debt = getdebt(g);  /* GC deficit (be paid now) */  /*所有新创对象都会增加debt的值*/
  if (!g->gcrunning) {  /* not running? */
    luaE_setdebt(g, -GCSTEPSIZE * 10);  /* avoid being called too often */
    return;
  }
  do {  /* repeat until pause or enough "credit" (negative debt) */
    lu_mem work = singlestep(L);  /* perform one single step */ /*work代表单次step(mark或者sweep)的成本*/
    debt -= work;
  } while (debt > -GCSTEPSIZE && g->gcstate != GCSpause);
  if (g->gcstate == GCSpause)
    setpause(g);  /* pause until next cycle */
  else {
    debt = (debt / g->gcstepmul) * STEPMULADJ;  /* convert 'work units' to Kb */
    luaE_setdebt(g, debt);
    runafewfinalizers(L);
  }
}

```
singlestep函数用来控制GC内部状态过程的迁移
``` c
static lu_mem singlestep (lua_State *L) {
  global_State *g = G(L);
  switch (g->gcstate) {
    case GCSpause: {
      g->GCmemtrav = g->strt.size * sizeof(GCObject*);
      restartcollection(g); /*启动GC,并mark根部(全局变量表和内部的thread(又称协程, 每个协程有自己的独立逻辑栈))*/
      g->gcstate = GCSpropagate;
      return g->GCmemtrav;  /*返回work成本,用于增量GC控制*/
    }
    case GCSpropagate: {
      g->GCmemtrav = 0;
      lua_assert(g->gray);
      propagatemark(g);     /*Traverse灰色链表中的一个对象*/
       if (g->gray == NULL)  /* no more gray objects? */
        g->gcstate = GCSatomic;  /* finish propagate phase */ /*当灰色链接中没有对象后,迁移到下一个状态*/
      return g->GCmemtrav;  /* memory traversed in this step */  /*返回work成本,用于增量GC控制*/
    }
    case GCSatomic: {
      lu_mem work;
      int sw;
      propagateall(g);  /* make sure gray list is empty */  /*再次检查灰色链表是否还有对象*/
      work = atomic(L);  /* work is what was traversed by 'atomic' */ /*这块操作是不可中断的,主要是将一些写屏障导致的灰色对象继续traverse*/
      sw = entersweep(L);
      g->GCestimate = gettotalbytes(g);  /* first estimate */;
      return work + sw * GCSWEEPCOST;
    }
    case GCSswpallgc: {  /* sweep "regular" objects */
      return sweepstep(L, g, GCSswpfinobj, &g->finobj);
    }
    case GCSswpfinobj: {  /* sweep objects with finalizers */
      return sweepstep(L, g, GCSswptobefnz, &g->tobefnz);
    }
    case GCSswptobefnz: {  /* sweep objects to be finalized */
      return sweepstep(L, g, GCSswpend, NULL);
    }
    case GCSswpend: {  /* finish sweeps */
      makewhite(g, g->mainthread);  /* sweep main thread */
      checkSizes(L, g);
      g->gcstate = GCScallfin;
      return 0;
    }
    case GCScallfin: {  /* call remaining finalizers */
      if (g->tobefnz && g->gckind != KGC_EMERGENCY) {
        int n = runafewfinalizers(L);
        return (n * GCFINALIZECOST);
      }
      else {  /* emergency mode or no more finalizers */
        g->gcstate = GCSpause;  /* finish collection */
        return 0;
      }
    }
    default: lua_assert(0); return 0;
  }
}
```

写屏障的具体相关函数
``` c
      vmcase(OP_SETLIST) {
        int n = GETARG_B(i);
        int c = GETARG_C(i);
        unsigned int last;
        Table *h;
        if (n == 0) n = cast_int(L->top - ra) - 1;
        if (c == 0) {
          lua_assert(GET_OPCODE(*ci->u.l.savedpc) == OP_EXTRAARG);
          c = GETARG_Ax(*ci->u.l.savedpc++);
        }
        luai_runtimecheck(L, ttistable(ra));
        h = hvalue(ra);
        last = ((c-1)*LFIELDS_PER_FLUSH) + n;
        if (last > h->sizearray)  /* needs more space? */
          luaH_resizearray(L, h, last);  /* pre-allocate it at once */
        for (; n > 0; n--) {
          TValue *val = ra+n;
          luaH_setint(L, h, last--, val);
          luaC_barrierback(L, h, val);
        }
        L->top = ci->top;  /* correct top (in case of previous open call) */
        vmbreak;
      }

#define luaC_barrierback(L,p,v) {  \
	if (iscollectable(v) && isblack(p) && iswhite(gcvalue(v)))  \
	luaC_barrierback_(L,p); }

/*
** barrier that moves collector backward, that is, mark the black object
** pointing to a white object as gray again.
*/
void luaC_barrierback_ (lua_State *L, Table *t) {
  global_State *g = G(L);
  lua_assert(isblack(t) && !isdead(g, t));
  black2gray(t);  /* make table gray (again) */
  linkgclist(t, g->grayagain);
}
```