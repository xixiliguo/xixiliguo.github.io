# 邻居子系统
实现二层通信，在ipv4场景下根据路由结果里的目标IP，通过arp报文获取该IP的mac地址，然后填充到报文里的目的mac。
一般来说报文里的源MAC会填充为发送设备的mac。

## ARP处理

普通以太网设备对应表项里的`neigh->ops` 都为`arp_hh_ops`
``` c
static const struct neigh_ops arp_hh_ops = {
	.family =		AF_INET,
	.solicit =		arp_solicit,            //调用这个函数发送 arp request消息
	.error_report =		arp_error_report,   //向上层报告error,通过发送icmp消息，路由不可达
	.output =		neigh_resolve_output,  
	.connected_output =	neigh_resolve_output,
};
```

### TCP发包时的arp处理
```
ip_finish_output2
    --> ip_neigh_for_gw   // 如果没找到网关，那就是同子网，查找目的ip的表项
	    --> ip_neigh_gw4  // 查找是否有ipv4网关的表项
		    --> __ipv4_neigh_lookup_noref
			--> __neigh_create  // 如果没找到，就新建
		--> ip_neigh_gw6  // 查找是否有ipv6网关的表项
	--> neigh_output     //如果没有错误，则通过该函数把包发出去
	    --> neigh_hh_output        //如果表项是connected状态且有缓冲数据，则有快速路径
		--> neigh_resolve_output   //其他场景
		    --> neigh_event_send
			    --> neigh_event_send_probe
				    --> __neigh_event_send  // 不是NUD_CONNECTED，NUD_DELAY，NUD_PROBE 这三个状态的其中之一，就发arp request
```

`neigh_event_send`如果返回0则直接根据表项里的mac地址填充到报文里的目的mac, 报文里的源mac是dev的mac, 
然后发出去。返回1说明要么包丢弃，要么skb暂时缓冲在neigh表项的一个队列里（incomplete状态时），等收到arp response后再发。  

返回 0 的情况：  
处于 NUD_CONNECTED |  NUD_DELAY | NUD_PROBE 这三种状态其中一种  
处于 NUD_STALE 状态， 修改为 NUD_DELAY  

返回 1 的情况：    
处于 NUD_NONE 状态的， 修改状态为 NUD_INCOMPLETE，设置定时器，发送 **arp request**，skb暂放入一个表项维护的队列里  
处于 NUD_INCOMPLETE 状态的， skb暂放入一个表项维护的队列里    

内核参数`arp_announce`  用于主动发arp request场景，在`arp_solicit`发送arp请求时调用。决定arp request报文里的src ip 的值。  
0 默认值，只要skb->saddr是本机的IP就能作为arp报文里的src ip   
1 skb->saddr是本地IP，同时跟网卡IP，目标IP都是同子网，才能作为arp报文里的src ip   
2 选取网卡的主IP   

### 收到arp报文后的处理

接收到arp requets后一般会发送are response, 如下参数是更细致的控制。  

`arp_ignore`  
0 默认值，主要IP是本地的，不管是不是配置在接收包的网卡上面，都响应  
1 只有IP是配置在接收包的网卡上，才响应  
2 不仅P是配置在接收包的网卡上，而且跟src ip 是同一个子网才响应  

`arp_filter`  
1 反向路由的目标网卡是接收消息的网卡时才允许响应，否则就被过滤掉。 计数器
为`nstat -r -z | grep ArpFilter`   
0 默认值，即使请求的IP是其他网卡的， 也运行发response, 这可能是个错误，但
可以理解， 因为IP是属于主机的，不是属于某个网卡的  

收到arp response后一般是更新下已有的表现， 如下参数是更细致的控制。  

`arp_accept`  
定义收到免费ARP且ip不在arp表项里是的行为    
0 默认值， 不创建表项   
1 创建表项   


### ip 命令
代码实现上arp表是全局变量， 但 `ip neigh` 在不同网络空间中执行的结果不一样。可以认为是隔离的，原因是
在`neigh_dump_table`函数里会检查每一个arp记录，对应的网卡的网络空间跟当前执行命令的网络空间是否一致，
一致才会返回结果。
``` c
static int neigh_dump_table(struct neigh_table *tbl, struct sk_buff *skb,
			    struct netlink_callback *cb,
			    struct neigh_dump_filter *filter)
{
	struct net *net = sock_net(skb->sk);
	struct neighbour *n;
	int rc, h, s_h = cb->args[1];
	int idx, s_idx = idx = cb->args[2];
	struct neigh_hash_table *nht;
	unsigned int flags = NLM_F_MULTI;

	if (filter->dev_idx || filter->master_idx)
		flags |= NLM_F_DUMP_FILTERED;

	rcu_read_lock_bh();
	nht = rcu_dereference_bh(tbl->nht);

	for (h = s_h; h < (1 << nht->hash_shift); h++) {
		if (h > s_h)
			s_idx = 0;
		for (n = rcu_dereference_bh(nht->hash_buckets[h]), idx = 0;
		     n != NULL;
		     n = rcu_dereference_bh(n->next)) {
			if (idx < s_idx || !net_eq(dev_net(n->dev), net))    // 判断网络空间是否一致
				goto next;
			if (neigh_ifindex_filtered(n->dev, filter->dev_idx) ||
			    neigh_master_filtered(n->dev, filter->master_idx))
				goto next;
			if (neigh_fill_info(skb, n, NETLINK_CB(cb->skb).portid,
					    cb->nlh->nlmsg_seq,
					    RTM_NEWNEIGH,
					    flags) < 0) {
				rc = -1;
				goto out;
			}
next:
			idx++;
		}
	}
	rc = skb->len;
out:
	rcu_read_unlock_bh();
	cb->args[1] = h;
	cb->args[2] = idx;
	return rc;
}
```

`ip -s neigh`可以显示更详细的信息, 下面例子中第一项里  
192.168.3.11 的mac地址为 68:ec:c5:f1:da:6f，属于 eth0设备。  
`2312/0/2312` 最近一次`used`,`confirmed`,`updated`的时间，自系统启动后的秒数。  
`probes 4` 代表`neigh->probes`的值   
```
192.168.3.11 dev eth0 lladdr 68:ec:c5:f1:da:6f  ref 1 used 2312/0/2312probes 4 REACHABLE
192.168.3.1 dev eth0 lladdr f8:20:a9:3c:eb:74  ref 1 used 3/255/3probes 1 DELA
```

`ip monitor neigh`可以实时观察neigh表项的状态变化， 注意这里只记录是定时器超时时发生的状态变化，
当发送路径`neigh_event_send`里触发的状态变化不会体现。
```
# ip -ts monitor neigh
[2025-06-26T22:50:45.728950] 192.168.3.11 dev eth0 FAILED
[2025-06-26T22:50:45.729083] Deleted 192.168.3.11 dev eth0 FAILED
[2025-06-26T22:50:45.729511] 192.168.3.11 dev eth0 lladdr 68:ec:c5:f1:da:6f REACHABLE
```

### 内核相关的数据结构

全局变量`struct neigh_table arp_tbl` 是arp表，所有网络空间共用。`arp_tbl->nht`指向hash表，里面保存
所有的表项，能动态扩容。
```c
RCU_INIT_POINTER(tbl->nht, neigh_hash_alloc(3));
```

`struct neighbour`部分字段的解释：  
neigh->used  在每次发包时更新， 单位：jiffies    
neigh->updated  表项的状态（比如NUD_STALE变为NUD_DELAY）发生变化的最近一次的时间 单位：jiffies    
neigh->confirmed 收到arp request后更新表项或者添加删除时时间 单位：jiffies    


### arp状态迁移

每个邻居表项都有定时器， 超时就执行`neigh_timer_handler`会改变状态，如下是具体的状态迁移：
![状态迁移](/img/arp.png)


参考：https://blogs.oracle.com/linux/post/arp-internals


## ipv6 ndp 处理

