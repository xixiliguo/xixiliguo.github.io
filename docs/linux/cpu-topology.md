
# 看懂cpu硬件知识
记录CPU拓扑，频率，代际，numa，缓存等信息。   
lscpu是查询cpu硬件的主要工具    

intel 面向服务器CPU Xeon(至强)系列   
amd   面向服务器CPU EPYC(霄龙)   


## 英特尔至强

2017到2024期间的名字规则如下：

![name](/img/xeon-name.png)

产品级别有 Platinum(铂金)， Gold(金牌)， Silver(银牌)

假设lscpu输出的Model name为： Intel(R) Xeon(R) Gold 6266C CPU @ 3.00GHz   

6266 里第一个数字 6 代表 Gold
* 如果数字是8,9 代表 Platinum 高端
* 如果数字是6,5 代表 Gold  中端
* 如果数字是4， 代表 Silver 入门级

2 代际编号，代表cpu的架构， 2表示第二代。数字越大，架构越新。
第一代 Skylake  
第二代 Cascade Lake  
第三代 Cooper Lake 或者 Ice Lake  
第四代 Sapphire Rapids  
第五代 Emerald Rapids  
第六代 Granite Rapids  

SKU 类似商品条形码，方便管理每款CPU，通常数字越大性能越好。  

@ 3.00GHz 代表主频是 3.0  

英特尔至强6处理器
24年开始名字规则如下：
![name](/img/xeon-6.png)

阿里云 c9 查询的结果为 Intel(R) Xeon(R) 6982P-C  

6 就是Xeon 6  
9 更细分的level  Granite Rapid-AP  
82 是 SKU  
P 代表性能核，注重单核性能，还可以是E（代表能动核），注重多任务并行。  
6900系列性能核 代号  Granite Rapids-AP 定位是旗舰机，适合要求严苛的云，科学计算，AI等领域。  
-C 表示Custom， 代表为某厂商定制。  

参考：https://www.intel.cn/content/www/cn/zh/support/articles/000059657/processors/intel-xeon-processors.html


## AMD 霄龙处理器

阿里云 c8a查询的model name为 AMD EPYC 9T24 96-Core Processor

AMD EPYC 代表 霄龙处理器  
9T24 里的T代表专为厂商定制的CPU
9代表 9系统，目前是最高系列  
该CPU属于 9004系列， zen4或者 zen4c架构  

EPYC 9003 第三代 微架构 Milan (zen3)  
EPYC 9004 第四代 微架构 Siena(zen4) Raphael(zen4c)  
EPYC 9005 第五代 微架构 Turin(zen5) Turin Dense(zen 5c)  s

参考：https://en.wikipedia.org/wiki/Epyc

zen 没带c：8个物理核是一个CCD，共享L3  
zen 带c：16个物理核是一个CCD，共享L3  


## 查询cpu架构的另一个方案

lscpu显示的cpu family和model 能大概知道是哪个代际的Cpu

### 方法1
linux源码里搜索  
intel arch/x86/include/asm/intel-family.h  

已阿里云 c9为例， cpu family 6 modle 173, 按十六进制显示 6, 0xad 在源码里搜索
``` c
#define INTEL_FAM6_GRANITERAPIDS_X	0xAD
#define INTEL_GRANITERAPIDS_X		IFM(6, 0xAD)
#define INTEL_FAM6_GRANITERAPIDS_D	0xAE
#define INTEL_GRANITERAPIDS_D		IFM(6, 0xAE)
```


amd   arch/x86/kernel/cpu/amd.c  bsp_init_amd函数  

| family  | model   | 微架构   |
| :--------   | :-----  |:-----  |
| 0x17 | 0x00..0x2f <br> 0x50..0x5f |zen 1 |
| 0x17 | 0x30..0x4f <br> 0x60..0x7f <br> 0x90..0x91 <br> 0xa0..0xaf |zen 2 |
| 0x19 | 0x00..0x0f <br> 0x20..0x5f |zen 3 |
| 0x19 | 0x10..0x1f <br> 0x60..0xaf |zen 4 or zen 4c |
| 0x1a | 0x00..0x2f <br> 0x40..0x4f <br> 0x70..0x7f |zen 5 or zen 5c |


### 方法2
intel cpu 直接在下面网址搜索  
https://www.intel.com/content/www/us/en/developer/topic-technology/software-security-guidance/processors-affected-consolidated-product-cpu-model.html  


## CPU 频率
虚拟机里有些cpu会显示频率，有些不会。 已官网文档为准。

## NUMA

numa里的cpu访问另一个numa里的内存会比访问本地的内存要慢。

`lscpu`和 `numactl -H` 都可以显示numa信息。

## 拓扑，L3缓存

`lscpu -e` 可显示cpu逻辑核，node, socket， l1,l2,l3等分布信息。

如下 CPU 逻辑核， NODE 是numa节点， socket是物理插槽， core是cpu核心
可以看到8个逻辑CPU位于同一个物理插槽，属于同一个numa。  
L3 全部为0， 说明所有CPU共享一个L3  
``` bash
# lscpu -e
CPU NODE SOCKET CORE L1d:L1i:L2:L3 ONLINE    MAXMHZ   MINMHZ       MHZ
  0    0      0    0 0:0:0:0          yes 4700.0000 400.0000 4098.5708
  1    0      0    1 1:1:1:0          yes 4700.0000 400.0000 1686.8430
  2    0      0    2 2:2:2:0          yes 4700.0000 400.0000 1963.8330
  3    0      0    3 3:3:3:0          yes 4700.0000 400.0000 2589.8000
  4    0      0    0 0:0:0:0          yes 4700.0000 400.0000 4100.0410
  5    0      0    1 1:1:1:0          yes 4700.0000 400.0000 4100.0000
  6    0      0    2 2:2:2:0          yes 4700.0000 400.0000 1919.8490
  7    0      0    3 3:3:3:0          yes 4700.0000 400.0000  938.4190
  ```