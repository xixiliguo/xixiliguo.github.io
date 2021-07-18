---
title: "Radix Tree介绍与httprouter源码笔记"
author: "Peter Wang"
tags: ["radix-tree", "httprouter"]
date: 2019-03-23T17:52:44+08:00
draft: false
---
Trie又叫前缀树, 广泛应用于字符串搜索. 它是多叉树结构, 每个节点代表一个字符, 从根出发到叶子, 所访问过的字符连接起来就是一个字符串.  
Radix tree 是Trie的一种优化方式, 对空间进一步压缩. 

<!--more-->
# 概述
Trie又叫前缀树, 广泛应用于字符串搜索. 它是多叉树结构, 每个节点代表一个字符, 从根出发到叶子, 所访问过的字符连接起来就是一个字符串.  
Radix tree 是Trie的一种优化方式, 对空间进一步压缩. 

Trie可用如下类型表示
``` go
type Trie struct {
    isLeaf bool      //用于表示该节点是不是一个字符串的结尾
    child []Trie
    value byte
}
```
下图左侧是字符串 sex,seed,sleep,son 四个字段串的Trie数据结构表示. 可用看到sleep这个字符串需要5个节点表示. 其实e后面只跟一个p, 也就是只有一个子节点, 是完全可以和父节点压缩合并的. 右侧是优化后的数据结构, 节省了空间,同时也提高了查询效率(左边字符串`sleep`查询需要5步, 右边只需要3步), 这就是radix tree.
![radix-tree](/img/radix-tree.jpg)


# httproute的实现
golang语言实现的httproute是个高性能的http路由分发器. 它负责将很多个路径注册到不同到处理函数. 当收到请求后, 快速查找是否请求的http路径有对应的处理器,并进行下一步的业务逻辑处理. 主要使用radix tree实现了高效的路径查找.   
同时路径还支持两种通配符匹配, 具体用法见readme

如下是节点的数据结构, `indices`字符和`children`里的节点排列顺序一一对应. handle非nil则说明是一个字符串的终点.
``` go
type node struct {
	path      string      // 该节点对应的path
	wildChild bool        // 是否通配
	nType     nodeType    // 表示节点类型
	maxParams uint8
	indices   string      // 子节点path的第一个byte的集合
	children  []*node    //  子节点
	handle    Handle
	priority  uint32
}
const (
	static nodeType = iota // 普通节点
	root                   // 根节点
    param                  // 命令参数对应的节点  :name 
	catchAll               // 匹配后面所有字符的节点    *all 
)
```

此处先不考虑通配符这块的逻辑,假设待匹配的为curpath,待比较的node先设置为根节点.  
插入新字符串的逻辑如下:  
1. 公共前缀长度小于node.path: 则需要将node split为两个node. parent node的path为公共前缀, child node的path为原node.path剔除公共b. 前缀部分后的path,继续步骤2  
2. 公共前缀长度小于curpath, 则进入步骤3, 否则步骤4  
3. 设置curpath为 curpath剔除公共前缀后的部分. 遍历node.indices的每一个byte, 与curpath的第一个byte比较.   
   有相等的,则设置node为匹配的child node, 跳回步骤1继续循环.  
   没有相等的, 则新建叶子节点, 退出  
4. 公共前缀长度等于node.path: 设置为叶子节点, 退出  

如下左边是/sex,/sleep,/son的内部呈现, 右边是插入/seed 后内部的呈现  
![radix-tree](/img/insert-tree-node.jpg)



代码实现主要是在`func (n *node) addRoute(path string, handle Handle)` 和  `func (n *node) insertChild(numParams uint8, path, fullPath string, handle Handle)`. 因为httproute加了很多对通配符路径的特殊处理, 可以先看`go-radix`了解下通用radix-tree的实现.

# 参考:
https://en.wikipedia.org/wiki/Radix_tree  
https://github.com/julienschmidt/httprouter  
https://github.com/armon/go-radix  

