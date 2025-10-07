


## 磁盘命名
每个磁盘都有`major`,`minor`号。代表一个盘。 分区也不例外。但并不是唯一。可能会随挂在的顺序而变化。
块设备驱动加载时，会调用`__register_blkdev`注册这类磁盘的`major`号，和盘符前缀。常见的
磁盘类型,major,前缀对应关系如下，`/proc/devices`显示系统已注册的磁盘类型，major和前缀信息
| 磁盘类型     | major       |  盘符前缀 |
| ----------- | ----------- |  ----------- |
| scsi        | 8           |  sd |
| virtio block| 253         |  vd |

**virtio block 并不一定是253， 而是寻址从254递减第一个未被使用的索引**

scsi的盘命名是sda, sdb, sdc, sdd依次增大。 在盘加载时选择第一个未被使用的索引决定的。 比如索引是0， 则为
sda, 索引为2则为sdb, 依次类推。 

## blktrace
`blktrace`是分析IO的利器，能跟踪每一个IO从生成到完成的全部过程，能有效分析IO时延问题。  
已磁盘`/dev/sda`为例，介绍常用的命令：
``` bash
blktrace -d /dev/sda             #收集信息，每个cpu生成一个文件，文件名为 sda.blktrace.X  按ctrl+c停止
blkparse -i sda -d sda.bin       #将当前目录里sda.blktrace.X 的文件合并为一个文件 sda.bin 二进制格式
blkparse -i sda -o sda.txt       #将当前目录里sda.blktrace.X 的文件合并为一个文件 sda.txt 文本格式
btt -i sda.bin                   #分析统计sda.bin里的IO信息
```
`blkparse`输出格式，每个字段的含义可参考`man blkparse`  