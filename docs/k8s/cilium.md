
Cilium是高性能的容器网络插件，利用内核的ebpf实现网络加速。本文主要介绍其实现原理。

## 使用kind搭建cilium环境

网络不好的情况下，可以参考镜像加速指南：  
https://github.com/DaoCloud/public-image-mirror  


### 修改内核参数

经常会遇到"too many open files"的问题，运行下面的命令修复：  
``` bash
cat >>/etc/sysctl.conf <<EOF
fs.inotify.max_user_watches = 524288
fs.inotify.max_user_instances = 512
EOF

sysctl -p
```
https://kind.sigs.k8s.io/docs/user/known-issues/#pod-errors-due-to-too-many-open-files

### 安装podman并下载镜像

在centos9上面使用yum安装podman并设置系统启动后默认运行。
``` bash
yum install podman
systemctl enable podman
```

为了避免每次机器重启后在k8s集群里实时拉cilium镜像，可以提前下载cilium相关的镜像，
``` bash
docker image pull quay.m.daocloud.io/cilium/cilium:v1.18.6
docker image pull quay.m.daocloud.io/cilium/operator-generic:v1.18.6
```

### 生成kind配置文件并启动集群

config.yaml 配置文件如下，默认关闭cni插件和不启动kubeproxy, 并指定使用 v1.33.7 版本
```
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  image: kindest/node:v1.33.7@sha256:d26ef333bdb2cbe9862a0f7c3803ecc7b4303d8cea8e814b481b09949d353040
- role: worker
  image: kindest/node:v1.33.7@sha256:d26ef333bdb2cbe9862a0f7c3803ecc7b4303d8cea8e814b481b09949d353040
- role: worker
  image: kindest/node:v1.33.7@sha256:d26ef333bdb2cbe9862a0f7c3803ecc7b4303d8cea8e814b481b09949d353040
networking:
  disableDefaultCNI: true
  kubeProxyMode: "none"
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry]
    config_path = "/etc/containerd/certs.d"
```

主机重启后，然后再重启 kind cluster, k8s api server的IP会变，所以简单地使用删除并新建的方式。 适用用任何场景。
创建时可以指定镜像用于加速。cilium镜像非常大，可以提前下载到本地，通过`kind load`预先加载进入。
``` bash
kind delete cluster
kind create cluster --config config.yaml --image m.daocloud.io/docker.io/kindest/node:v1.33.7
kind load docker-image quay.m.daocloud.io/cilium/cilium:v1.18.6
kind load docker-image quay.m.daocloud.io/cilium/operator-generic:v1.18.6
```

运行下面命令，修改kind内部containerd的配置用于加速
```
REGISTRY_DIR="/etc/containerd/certs.d/quay.io"
for node in $(kind get nodes); do
  docker exec "${node}" mkdir -p "${REGISTRY_DIR}"
  cat <<EOF | docker exec -i "${node}" cp /dev/stdin "${REGISTRY_DIR}/hosts.toml"
server = "https://quay.io"
[host."https://quay.m.daocloud.io"]
  capabilities = ["pull", "resolve"]
  skip_verify = true
EOF
done
```

### 安装cilium并启动
提前下载cilium-cli 和 helm， cilium配置上面去掉kube-proxy, 使用原生路由
```bash
K8S_HOST=$(kubectl get endpointslice kubernetes -o jsonpath='{.endpoints[0].addresses[0]}')
K8S_PORT=$(kubectl get endpointslice kubernetes -o jsonpath='{.ports[0].port}')
helm install cilium cilium/cilium --version 1.18.6 \
  --namespace kube-system \
  --set ipam.mode="kubernetes" \
  --set kubeProxyReplacement="true" \
  --set envoy.enabled="false" \
  --set debug.enabled=false \
  --set debug.verbose="" \
  --set bpf.enableTCX=false \
  --set bpf.ctAccounting=false \
  --set routingMode="native" \
  --set ipv4NativeRoutingCIDR="10.244.0.0/16" \
  --set bpf.masquerade=true \
  --set autoDirectNodeRoutes=true \
  --set endpointRoutes.enabled=false \
  --set bandwidthManager.enabled=true \
  --set k8sServiceHost="${K8S_HOST}" \
  --set k8sServicePort="${K8S_PORT}"
```
https://docs.cilium.io/en/stable/installation/k8s-install-helm/


`cilium status` 检查安装状态,如下显示 clium和opeartor组件都是OK状态。
``` bash
[root@localhost kind]# cilium status
    /¯¯\
 /¯¯\__/¯¯\    Cilium:             OK
 \__/¯¯\__/    Operator:           OK
 /¯¯\__/¯¯\    Envoy DaemonSet:    disabled (using embedded mode)
 \__/¯¯\__/    Hubble Relay:       disabled
    \__/       ClusterMesh:        disabled

DaemonSet              cilium                   Desired: 3, Ready: 3/3, Available: 3/3
Deployment             cilium-operator          Desired: 2, Ready: 2/2, Available: 2/2
Containers:            cilium                   Running: 3
                       cilium-operator          Running: 2
                       clustermesh-apiserver
                       hubble-relay
Cluster Pods:          7/7 managed by Cilium
Helm chart version:    1.18.6
Image versions         cilium             quay.io/cilium/cilium:v1.18.6@sha256:42ec562a5ff6c8a860c0639f5a7611685e253fd9eb2d2fcdade693724c9166a4: 3
                       cilium-operator    quay.io/cilium/operator-generic:v1.18.6@sha256:34a827ce9ed021c8adf8f0feca131f53b3c54a3ef529053d871d0347ec4d69af: 2
```

`cilium uninstall` 卸载cilium相关的资源

## cilium基本概念

cilium有两个重要的概念：  
endpoint：描述单个POD或者containers网络模型的，一个POD对应一个endpoint，endpointID在单主机内唯一。  
identity：描述一组具备相同标签的endpoint的集合，用于实现networkpolicy的。cilium实现了基于label的policy,内部会转化
为identity, identityID在集群内唯一。  

### cni插件

默认的配置文件是/etc/cni/net.d/05-cilium-cni.conf， 内容如下：
``` bash
root@kind-worker:/home/cilium# cat /etc/cni/net.d/05-cilium-cni.conf
{
    "cniVersion": "0.3.1",
    "name": "cilium",
    "type": "cilium-cni",
    "enable-debug": true,
    "log-file": "/var/run/cilium/cilium-cni.log"
}
```
`type`表示可执行文件名，当containerd创建POD时，会调用主机侧`/opt/cni/bin/cilium-cni`，它通过unix socket(默认是/run/cilium/cilium.sock)
与cilium-agent通信，cilium-agent会创建endpoint, 创建veth pair, 配置IP、route, 挂在ebpf程序后返回结果跟cni。

### 组件&日志&配置

cilium-operator deployment部署，cilium的控制面，用于IP分配（可选），维护identity。  

cilium-agent    daemonset部署，监控pod/k8s service创建/销毁，维护ebpf程序，确保网络通信正常。  

/var/run/cilium 存放clium agent运行过程中的重要信息系。比如cgroupv2, endpoint,主机eth0网卡加载的ebpf源代码。  

`kubectl get cm -n kube-system cilium-config -oyaml` 查询cilium配置信息

进入clium容器后，常用的命令有：  

cilium status 快速查询当前状态， --verbose 打印更详细的状态信息

``` bash
root@kind-worker:/home/cilium# cilium status
KVStore:                 Disabled
Kubernetes:              Ok         1.33 (v1.33.7) [linux/amd64]
Kubernetes APIs:         ["EndpointSliceOrEndpoint", "cilium/v2::CiliumCIDRGroup", "cilium/v2::CiliumClusterwideNetworkPolicy", "cilium/v2::CiliumEndpoint", "cilium/v2::CiliumNetworkPolicy", "cilium/v2::CiliumNode", "core/v1::Pods", "networking.k8s.io/v1::NetworkPolicy"]
KubeProxyReplacement:    True   [eth0    10.89.0.2 fc00:f853:ccd:e793::2 fe80::d4af:58ff:feb7:fc82 (Direct Routing)]
Host firewall:           Disabled
SRv6:                    Disabled
CNI Chaining:            none
CNI Config file:         successfully wrote CNI configuration file to /host/etc/cni/net.d/05-cilium.conflist
Cilium:                  Ok   1.18.6 (v1.18.6-95896696)
NodeMonitor:             Listening for events on 8 CPUs with 64x4096 of shared memory
Cilium health daemon:    Ok
IPAM:                    IPv4: 2/254 allocated from 10.244.3.0/24,
IPv4 BIG TCP:            Disabled
IPv6 BIG TCP:            Disabled
BandwidthManager:        Disabled
Routing:                 Network: Native   Host: BPF
Attach Mode:             Legacy TC
Device Mode:             veth
Masquerading:            BPF   [eth0]   10.244.0.0/16  [IPv4: Enabled, IPv6: Disabled]
Controller Status:       16/16 healthy
Proxy Status:            OK, ip 10.244.3.183, 0 redirects active on ports 10000-20000, Envoy: embedded
Global Identity Range:   min 256, max 65535
Hubble:                  Ok              Current/Max Flows: 1397/4095 (34.11%), Flows/s: 1.34   Metrics: Disabled
Encryption:              Disabled
Cluster health:          3/3 reachable   (2026-03-23T12:29:16Z)   (Probe interval: 1m56.754608943s)
Name                     IP              Node                     Endpoints
Modules Health:          Stopped(12) Degraded(0) OK(62)
```
cilium-health status --verbose 检测node之间的网络连通性。  
分icmp和http两种探测，更包括rtt等时延信息。   
检查nodeIP <--> podIP， nodeIP <--> nodeIP之前的网络连接，能覆盖绝大多数场景。  
但并不意味着podIP(local node) <--> podIP(remote node) 通信正常。  
``` bash
root@kind-worker:/home/cilium# cilium-health status --verbose
Cluster health:   3/3 reachable   (2026-03-23T12:31:13Z)   (Probe interval: 1m56.754608943s)
Name              IP              Node                     Endpoints
  kind-worker (localhost):
    Host connectivity to 10.89.0.2:
      ICMP to stack:   OK, RTT=197.325µs    (Last probed: 2026-03-23T12:29:16Z)
      HTTP to agent:   OK, RTT=1.299813ms   (Last probed: 2026-03-23T12:29:16Z)
    Endpoint connectivity to 10.244.3.46:
      ICMP to stack:   OK, RTT=1.069895ms   (Last probed: 2026-03-23T12:29:36Z)
      HTTP to agent:   OK, RTT=1.230774ms   (Last probed: 2026-03-23T12:29:36Z)
  kind-control-plane:
    Host connectivity to 10.89.0.4:
      ICMP to stack:   OK, RTT=253.969µs    (Last probed: 2026-03-23T12:30:34Z)
      HTTP to agent:   OK, RTT=2.436941ms   (Last probed: 2026-03-23T12:30:34Z)
    Endpoint connectivity to 10.244.0.39:
      ICMP to stack:   OK, RTT=891.61µs     (Last probed: 2026-03-23T12:30:53Z)
      HTTP to agent:   OK, RTT=3.132793ms   (Last probed: 2026-03-23T12:30:53Z)
  kind-worker2:
    Host connectivity to 10.89.0.3:
      ICMP to stack:   OK, RTT=1.920468ms   (Last probed: 2026-03-23T12:31:32Z)
      HTTP to agent:   OK, RTT=8.194713ms   (Last probed: 2026-03-23T12:31:32Z)
    Endpoint connectivity to 10.244.1.212:
      ICMP to stack:   OK, RTT=660.781µs    (Last probed: 2026-03-23T12:31:13Z)
      HTTP to agent:   OK, RTT=1.215465ms   (Last probed: 2026-03-23T12:31:13Z)
```

cilium monitor -t drop 打印所有在cilium处理中丢弃的报文详情。（比如往ct表里因超过最大
限制插入记录失败， policy deny等）。命令只查实时发生的。  

clium config 只打印能修改且实时生效的配置， -a 则打印所有配置。  
``` bash
root@kind-worker:/home/cilium# cilium config
##### Read-write configurations #####
ConntrackAccounting               : Disabled
Debug                             : Disabled
DebugLB                           : Disabled
DropNotification                  : Enabled
MonitorAggregationLevel           : Medium
PolicyAccounting                  : Enabled
PolicyAuditMode                   : Disabled
PolicyTracing                     : Disabled
PolicyVerdictNotification         : Enabled
SourceIPVerification              : Enabled
TraceNotification                 : Enabled
MonitorNumPages                   : 64
PolicyEnforcement                 : default
```

### POD网络配置

只有一条默认路由，网关是主机网络空间里cilium_host网卡上面的IP
``` bash
[root@localhost kind]# nsenter -t 10280 -n ip a
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
    inet6 ::1/128 scope host
       valid_lft forever preferred_lft forever
11: eth0@if12: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
    link/ether a6:36:57:51:25:c6 brd ff:ff:ff:ff:ff:ff link-netns netns-660075a5-31eb-6a1e-86ba-87574260db1f
    inet 10.244.0.66/32 scope global eth0
       valid_lft forever preferred_lft forever
    inet6 fe80::a436:57ff:fe51:25c6/64 scope link
       valid_lft forever preferred_lft forever
[root@localhost kind]# nsenter -t 10280 -n ip route
default via 10.244.0.154 dev eth0 mtu 1500
```


### Host网络配置


存活/就绪探针，需要kubelet访问podIP,EnableEndpointRoutes配置不同则报文发出去的网卡不同。
| EnableEndpointRoutes | 挂载点 |
| :--- | :--- |
| false | 发往cilium_host网卡 |
| true | 发往lxcXXXX网卡 |


所有的出node节点的流量都经过eth0网卡  
容器的veth网卡，在pod里名字为eth0,在主机侧位lxcXXXX  
cilium_host和cilium_net是一对veth网卡  
lxc_health的作用是cilium启动后生成的endpoint, 但没有对应的pod, 主要目的是完成node之间的连通性检测。  
``` bash
root@kind-control-plane:/# ip a | grep qlen
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
2: eth0@if6: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
3: cilium_net@cilium_host: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
4: cilium_host@cilium_net: <BROADCAST,MULTICAST,NOARP,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
6: lxc_health@if5: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
8: lxc96e8f23401d4@if7: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
10: lxc47d92680148a@if9: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
12: lxc471ae3f8c004@if11: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default qlen 1000
root@kind-control-plane:/# ip route
default via 10.89.0.1 dev eth0 proto static metric 100
10.89.0.0/24 dev eth0 proto kernel scope link src 10.89.0.4
10.244.0.0/24 via 10.244.0.154 dev cilium_host proto kernel src 10.244.0.154
10.244.0.154 dev cilium_host proto kernel scope link
10.244.1.0/24 via 10.89.0.3 dev eth0 proto kernel
10.244.3.0/24 via 10.89.0.2 dev eth0 proto kernel
```

### 带宽管理

修改主机拥塞算法为 cubic (5.18内核后变为bbr)，qdisc修改为fq  
POD级出入方向是否限速在ebpf prog里判断，原理是修改报文的发送时间，后续内核的fq机制实施具体的限速。  
`tc qdisc show dev eth0` 可看到 fq 和 horizon 的字样。  


### 网络策略

L3 L4 的策略ebpf处理，如果deny则直接将报文丢弃。  
如果涉及L7，则根据bpf.tproxy配置运行不同的模式  
false  走table处理，消息从tc发到netfilter这一层，iptable里的tproxy把相关报文重定向到envoy的监控端口  
true bpf处理  

`iptables -t mangle -nvL` 可查询tproy相关的配置
``` bash
root@kind-worker2:/# iptables -t mangle -nvL
Chain PREROUTING (policy ACCEPT 9386 packets, 1544K bytes)
 pkts bytes target     prot opt in     out     source               destination
 9386 1544K CILIUM_PRE_mangle  0    --  *      *       0.0.0.0/0            0.0.0.0/0            /* cilium-feeder: CILIUM_PRE_mangle */

Chain INPUT (policy ACCEPT 8874 packets, 1516K bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain FORWARD (policy ACCEPT 504 packets, 27216 bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain OUTPUT (policy ACCEPT 8704 packets, 1072K bytes)
 pkts bytes target     prot opt in     out     source               destination

Chain POSTROUTING (policy ACCEPT 9208 packets, 1099K bytes)
 pkts bytes target     prot opt in     out     source               destination
 9208 1099K CILIUM_POST_mangle  0    --  *      *       0.0.0.0/0            0.0.0.0/0            /* cilium-feeder: CILIUM_POST_mangle */

Chain CILIUM_POST_mangle (1 references)
 pkts bytes target     prot opt in     out     source               destination

Chain CILIUM_PRE_mangle (1 references)
 pkts bytes target     prot opt in     out     source               destination
    0     0 MARK       0    --  *      !lo     0.0.0.0/0            0.0.0.0/0            socket --transparent mark match ! 0xe00/0xf00 mark match ! 0x800/0xf00 /* cilium: any->pod redirect proxied traffic to host proxy */ MARK set 0x200
    0     0 TPROXY     6    --  *      *       0.0.0.0/0            0.0.0.0/0            mark match 0x57840200 /* cilium: TPROXY to host cilium-dns-egress proxy */ TPROXY redirect 127.0.0.1:33879 mark 0x200/0xffffffff
    0     0 TPROXY     17   --  *      *       0.0.0.0/0            0.0.0.0/0            mark match 0x57840200 /* cilium: TPROXY to host cilium-dns-egress proxy */ TPROXY redirect 127.0.0.1:33879 mark 0x200/0xffffffff

Chain KUBE-IPTABLES-HINT (0 references)
 pkts bytes target     prot opt in     out     source               destination

Chain KUBE-KUBELET-CANARY (0 references)
 pkts bytes target     prot opt in     out     source               destination
 ```


``` yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: "rule1"
spec:
  description: "L7 policy to restrict access to specific HTTP call"
  endpointSelector:
    matchLabels:
      org: empire
      class: deathstar
  ingress:
  - fromEndpoints:
    - matchLabels:
        org: empire
    toPorts:
    - ports:
      - port: "80"
        protocol: TCP
      rules:
        http:
        - method: "POST"
          path: "/v1/request-landing"
```

上面是一条CiliumNetworkPolicy规则，在标签为 `class:deathstar && org:empire` 的POD上面生效，在入方向只允许来自 标签为`org:empire`的POD 且TCP 端口是 80, http path是 `post /v1/request-landing`的报文  

登录某个满足标签为 class:deathstar && org:empire 的POD对应的cilium容器里， 可通过cilium endpoint list 获取
endpointID, 比如1394 , 运行下面的命令查询策略是否已经下发到pod了  
``` bash
root@kind-worker2:/home/cilium# cilium map get cilium_policy_v2_01394
Key                     Value      State   Error
Egress: 0 ANY           0 0
Ingress: 1 ANY          0 0
Ingress: 61915 80/TCP   17502 24
Ingress: 3562 80/TCP    17502 24
```
可以看到只允许identity为61915或者3562的源POD， 且TCP端口为80的， 重定向到 envoy的监听端口 17502 进一步判断http类型。  
`cilium identity list` 可以查询identityID和POD的对应关系。  

## bpf数据面

cilium通过内核ebpf功能构建了非常快速的容器网络路径，以下主要涉及各场景下路径图和代码分析。  
以下所有场景分析不涉及L7策略的情况  

### SockLB

cilium支持在东西向的访问使用sockLB功能，主要原理是在socket层面完成ClusterIP-->PodIP的转换。  

传统的iptable,ipvs都是在L3层对经过的每个报文的源端或者目的端ip+port信息进行修改，也就nat转换。但socketLB
是在socket层面完成转换。以tcp为例，当创建完socket后，调用connect连接clusterIP时，内核里面会运行ebpf prog，发现
目的IP是clusterIP后随机选择后端POD ip+port,并修改报文skb里的目标端信息。后续网络中所有路径看到的都是 POD --> POD。
没有clusterIP了。  
nat转换只发生一次，不需要对每个报文都进行nat，大幅提高性能。整体上讲，应用程序认为自己连接的是clusterIP，但其实底层
全部是podIP之间的通信。  

#### hook到cgroupv2的prog 
sockLB依赖cgroupv2, cilium会重新将cgroupv2挂在到`/run/cilium/cgroupv2`，下面的命令显示多个ebpf prog挂到
多个TCP或者UDP的关键函数。 socket级别的prog都挂在到cgroupv2的根目录上面， 这样子目录的socket活动也能跟踪到。
``` bash
root@kind-worker:/home/cilium# bpftool cgroup tree /run/cilium/cgroupv2
CgroupPath
ID       AttachType      AttachFlags     Name
/run/cilium/cgroupv2
1190     cgroup_inet4_connect multi           cil_sock4_connect
1192     cgroup_inet6_connect multi           cil_sock6_connect
1195     cgroup_inet4_post_bind multi           cil_sock4_post_bind
1194     cgroup_inet6_post_bind multi           cil_sock6_post_bind
1200     cgroup_udp4_sendmsg multi           cil_sock4_sendmsg
1193     cgroup_udp6_sendmsg multi           cil_sock6_sendmsg
1196     cgroup_udp4_recvmsg multi           cil_sock4_recvmsg
1199     cgroup_udp6_recvmsg multi           cil_sock6_recvmsg
1197     cgroup_inet4_getpeername multi           cil_sock4_getpeername
1191     cgroup_inet6_getpeername multi           cil_sock6_getpeername
1198     cgroup_inet_sock_release multi           cil_sock_release
```

在内核里，多个函数会调用宏BPF_CGROUP_RUN_PROG_XXXX来执行cilium注入到内核的prog。这些prog返回1为正常。 返回0表示有异常。
在支持帮助函数`bpf_set_retval`的attachtype里，prog可以修改返回值为非0和1的其他值。   
目前该帮助函数支持的type有：  
cgroup_inet[4|6]_post_bind    
cgroup_inet[4|6]_connect   
cgroup_udp[4|6]_sendmsg   
cgroup_inet_sock_release    

`include/linux/bpf-cgroup.h` 定义了所有的BPF_CGROUP_RUN_PROG_XXXX. 具体与attachtype的对应关系如下:
| entry | AttachType | prog run宏定义 | 函数调用关系 |
| :--- | :--- | :---- | :--- |
| cil_sock4_connect | cgroup_inet4_connect | BPF_CGROUP_RUN_PROG_INET4_CONNECT | __inet_stream_connect --> tcp_v4_pre_connect --> bpf_prog_run |
| cil_sock6_connect | cgroup_inet6_connect | BPF_CGROUP_RUN_PROG_INET6_CONNECT | __inet_stream_connect --> tcp_v6_pre_connect --> bpf_prog_run |
| cil_sock4_post_bind | cgroup_inet4_post_bind | BPF_CGROUP_RUN_PROG_INET4_POST_BIND | __inet_bind --> bpf_prog_run |
| cil_sock6_post_bind | cgroup_inet6_post_bind | BPF_CGROUP_RUN_PROG_INET6_POST_BIND | __inet6_bind --> bpf_prog_run |
| cil_sock4_sendmsg | cgroup_udp4_sendmsg | BPF_CGROUP_RUN_PROG_UDP4_SENDMSG_LOCK | udp_sendmsg--> bpf_prog_run |
| cil_sock6_sendmsg | cgroup_udp6_sendmsg | BPF_CGROUP_RUN_PROG_UDP6_SENDMSG_LOCK | udpv6_sendmsg --> bpf_prog_run |
| cil_sock4_recvmsg | cgroup_udp4_recvmsg | BPF_CGROUP_RUN_PROG_UDP4_RECVMSG_LOCK | udp_recvmsg --> bpf_prog_run |
| cil_sock6_recvmsg | cgroup_udp6_recvmsg | BPF_CGROUP_RUN_PROG_UDP6_RECVMSG_LOCK | udpv6_recvmsg --> bpf_prog_run |
| cil_sock4_getpeername | cgroup_inet4_getpeername | BPF_CGROUP_RUN_SA_PROG_LOCK | __sys_getpeername --> inet_getname --> bpf_prog_run |
| cil_sock6_getpeername | cgroup_inet6_getpeername | BPF_CGROUP_RUN_SA_PROG_LOCK | __sys_getpeername --> inet6_getname --> bpf_prog_run |
| cil_sock_release | cgroup_inet_sock_release | BPF_CGROUP_RUN_PROG_INET_SOCK_RELEASE | __sock_release --> [inet|inet6]_release -->bpf_prog_run |


socketLB 只支持tcp和udp协议，不要用ping探测访问clusterIP的可达性。对TCP和UDP的处理上不同。   

tcp连接是有状态的，处于ESTABLISHED状态的连接具有唯一的四元组信息。只需要在connect时替换为后端的IP即可。所以
hook到 cgroup_inet[4|6]_connect即可。在connect阶段目的IP和端口会替换为后端随机选择的POD的IP和端口，然后发syn报文出去。`struct sock`里记录的目标信息是POD的，收到的syn-ack报文也是pod <->pod的，对于上层的传输是透明的。用户可能通过系统调用`getpeername`查询目标端信息，有其他prog会返回clusterIP信息给上层程序。此时ebpf会运行cil_sock[4|6]_getpeername，通过查询map cilium_lb4_reverse_sk 获取ClusterIP信息返回给用户侧。   

udp连接是无状态的，同一个udp socket可以多个目的IP+Port发消息，也可以接受来自多个源IP+PORT的消息。所以不仅在
cgroup_inet[4|6]_connect, 还要在 cgroup_udp[4|6]_recvmsg，cgroup_udp[4|6]_sendmsg 拦截并替换IP。  
应用程序可以用系统调用getpeername获取目的IP， 因为内核里sock经过之前prog的操作，记录的目的是POD的，所以还需要在
cgroup_inet[4|6]_getpeername 拦截getpeername调用，访问记录在map里的lb->pod映射信息，反向或者lb信息后返回给应用程序。  

hook 到 cgroup_inet[4|6]_post_bind 的prog主要功能是防止host网络空间里的进程bind时的srcIP+srcPort与NodePort已经申请过的端口。
这种情况会直接返回`-EADDRINUSE`给上层。    

hook 到 cgroup_inet_sock_release 的prog 在socke释放时清理cilium_lb4_reverse_sk表里对应的记录。  



#### SockLB map

名词概念：  
slot是perLB的范围， 比如前端有两个后端，那么slot 1 和 2 分别代表两个后端  
backedID 是全局随机数，唯一代表一个后端，因为不同的前端（比如clusterIP或者nodePort)都可以映射到同一个后端。后端需要一个唯一代表自己的值  

cilium_lb4_services_v2  cilium_lb6_services_v2   
前端和后端都各生成一条kv记录，slot信息在key里，slot为0代表前端。 backendID信息在value里，slot为0的value里的backendID可以表示L7的proxy port。通过 backendID 可以从 cilium_lb4_backends_v3 获取后端的具体prot, ip, port 信息   

cilium_lb4_backends_v3， cilium_lb6_backends_v3，   
只存后端的信息， key是backendID, value里有prot,ip,port信息    
 
cilium_lb4_reverse_nat  cilium_lb6_reverse_nat    
k8s servcie里的clusterIP或者nodeip 对应一个retnat_id, 如果一个servcie同时实现了nodeport, clusterip
那么就有两个retnat_id。每个新连接里具体forendIP-->backendIP的映射关系会存在这里。  
唯一的五元组信息对应一条kv记录。   


如下命令查询全局LB信息，代码实现位于cilium-dbg/cmd/bpf_lb_list.go
``` bash
# cilium bpf lb list
SERVICE ADDRESS             BACKEND ADDRESS (REVNAT_ID) (SLOT)
10.96.0.10:53/UDP (0)       0.0.0.0:0 (3) (0) [ClusterIP, non-routable]
10.96.0.10:53/UDP (2)       10.244.0.191:53/UDP (3) (2)
10.96.0.10:53/UDP (1)       10.244.0.104:53/UDP (3) (1)
```
servcie addr后面括号里是slot号。 0 即前端IP    
前端是NodePort的，还有0.0.0.0:xxx 这种service addr, 应该是用于防止node上面的其他程序bind到NodePort的端口上面的。其他程序bind时，源IP可以是0.0.0.0 ，也可以是eth0网卡上面的IP。   
non-routable 的servcie addr要么是clusterIP，要么是 0.0.0.0:xxx 这种NodePort的，主要用于过滤主机外发到本机且目的IP是clusterIP的报文，因为clusterIP只在集群内有效。   


#### 代码分析

上面bpftool里显示的name 比如 cil_sock4_connect， 可以在代码仓库 bpf目录下面搜到，它就是主函数，也叫入口函数。


以 tcp connect 和 getpeername过一下代码

``` c
cil_sock4_connect()                       //返回1表示流程继续往下走， 返回0则向上层返回错误。
  __sock4_xlate_fwd()                     //主要的处理逻辑
    lb4_lookup_service()                  //查cilium_lb4_services_v2, 根据目的IP和端口，查frontend
    sock_select_slot()                    //如果上个函数匹配到service,则生成随机数
    __lb4_lookup_backend_slot()           //查cilium_lb4_services_v2, 获取backend
    __lb4_lookup_backend()                //查cilium_lb4_backends_v3， 根据backend->idbackend_id 找具体的backend信息
    sock4_update_revnat()                 //根据key:已选择的backend，value:frontend->的具体信息，写入到cilium_lb4_reverse_sk
    ctx->user_ip4 = backend->address      //用选择的IP修改报文里的目标IP
	  ctx_set_port(ctx, backend->port)      //用选择的Port修改报文里的目标端口
```



``` c
__section("cgroup/connect4")
int cil_sock4_connect(struct bpf_sock_addr *ctx)
{
	int err;

	err = __sock4_xlate_fwd(ctx, ctx, false);
	if (err == -EHOSTUNREACH || err == -ENOMEM) {    //并不是所有的Error都会返回 SYS_REJECT
		try_set_retval(err);
		return SYS_REJECT;
	}
	return SYS_PROCEED;  // 可以理解为成功，内核函数继续按正常处理。
}
```


cilium monitor -t trace 可以看到非常详细的信息
``` bash
root@kind-worker:/home/cilium# cilium monitor --related-to 2927 -v -t trace
Listening for events on 8 CPUs with 64x4096 of shared memory
Press Ctrl-C to qui
CPU 03: [pre-xlate-fwd] cgroup_id: 16761 sock_cookie: 72480, dst [10.96.211.254]:80 tcp
CPU 03: [post-xlate-fwd] cgroup_id: 16761 sock_cookie: 72480, dst [10.244.2.148]:80 tcp
time=2026-03-10T13:10:36.8488477Z level=info msg="Initializing dissection cache..."
-> network flow 0xd67215a2 , identity 22196->60386 state new ifindex eth0 orig-ip 0.0.0.0: 10.244.1.56:56944 -> 10.244.2.148:80 tcp SYN
-> endpoint 2927 flow 0x8e37b814 , identity 60386->22196 state reply ifindex lxc61f83227c4ba orig-ip 10.244.2.148: 10.244.2.148:80 -> 10.244.1.56:56944 tcp SYN, ACK
-> network flow 0xd67215a2 , identity 22196->60386 state established ifindex eth0 orig-ip 0.0.0.0: 10.244.1.56:56944 -> 10.244.2.148:80 tcp ACK
CPU 03: [pre-xlate-rev] cgroup_id: 16761 sock_cookie: 72480, dst [10.244.2.148]:80 tcp
CPU 03: [post-xlate-rev] cgroup_id: 16761 sock_cookie: 72480, dst [10.96.211.254]:80 tcp
CPU 03: [pre-xlate-rev] cgroup_id: 16761 sock_cookie: 72480, dst [10.244.2.148]:80 tcp
CPU 03: [post-xlate-rev] cgroup_id: 16761 sock_cookie: 72480, dst [10.96.211.254]:80 tcp
-> network flow 0xd67215a2 , identity 22196->60386 state established ifindex eth0 orig-ip 0.0.0.0: 10.244.1.56:56944 -> 10.244.2.148:80 tcp ACK
-> endpoint 2927 flow 0x8e37b814 , identity 60386->22196 state reply ifindex lxc61f83227c4ba orig-ip 10.244.2.148: 10.244.2.148:80 -> 10.244.1.56:56944 tcp ACK
-> network flow 0xd67215a2 , identity 22196->60386 state established ifindex eth0 orig-ip 0.0.0.0: 10.244.1.56:56944 -> 10.244.2.148:80 tcp ACK, FIN
-> endpoint 2927 flow 0x8e37b814 , identity 60386->22196 state reply ifindex lxc61f83227c4ba orig-ip 10.244.2.148: 10.244.2.148:80 -> 10.244.1.56:56944 tcp ACK, FIN
-> network flow 0xd67215a2 , identity 22196->60386 state established ifindex eth0 orig-ip 0.0.0.0: 10.244.1.56:56944 -> 10.244.2.148:80 tcp ACK
```




### TC层



挂在网卡tc层的prog函数入口和挂载点详情如下：
| entry | 挂载点 |
| :--- | :--- |
| cil_from_container | tc ingress (veth in host) |
| cil_from_netdev | tc ingress (主网卡 eth0) |
| cil_to_netdev | tc egress (主网卡 eth0) |


#### ingress
TC层ingress在内核侧的处理主要在`__netif_receive_skb_core`函数里，该函数里先执行完抓包相关动作后进入sch_handle_ingress
处理。 ebpf prog的返回值常见的有`TC_ACT_REDIRECT`（转发），`TC_ACT_OK`（正常处理），`TC_ACT_SHOT`（丢弃）。
以下的简化的代码处理逻辑：
``` c
static int __netif_receive_skb_core(struct sk_buff **pskb, bool pfmemalloc,
				    struct packet_type **ppt_prev) {
  // 先执行抓包相关的函数
  if (static_branch_unlikely(&ingress_needed_key)) {
		bool another = false;
		skb = sch_handle_ingress(skb, &pt_prev, &ret, orig_dev,
					 &another);
    // TC_ACT_REDIRECT，且主机传到peer的，another为true
    // 直接在同一个函数里处理两个网卡的ingress，性能好。
		if (another)
			goto another_round;   
    // TC_ACT_SHOT，包已丢弃，则skb为null, 直接return
    // TC_ACT_REDIRECT，非peer的通过目标网卡tx方向的xmit函数把消息已经发出去了
    // 则skb为null, 也直接return
		if (!skb)
			goto out;
    // TC_ACT_OK 则沿原流程继续处理，进入内核协议栈。
	}
out:
	*pskb = skb;
	return ret;
}

static __always_inline struct sk_buff *
sch_handle_ingress(struct sk_buff *skb, struct packet_type **pt_prev, int *ret,
		   struct net_device *orig_dev, bool *another)
{
	struct bpf_mprog_entry *entry = rcu_dereference_bh(skb->dev->tcx_ingress);
	enum skb_drop_reason drop_reason = SKB_DROP_REASON_TC_INGRESS;
	int sch_ret;
	sch_ret = tc_run(tcx_entry(entry), skb, &drop_reason);
ingress_verdict:
	switch (sch_ret) {
	case TC_ACT_REDIRECT:
		/* skb_mac_header check was done by BPF, so we can safely
		 * push the L2 header back before redirecting to another
		 * netdev.
		 */
		__skb_push(skb, skb->mac_len);
    // skb_do_redirect 处理是 skb.data 指向 L2的数据-
    // 上面的英文注释表明ebpf已经处理好了L2的mac层数据。
		if (skb_do_redirect(skb) == -EAGAIN) {
      // 后续skb需要继续在__netif_receive_skb_core处理
      // 所以需要pull让skb->data 指向L3
			__skb_pull(skb, skb->mac_len);
			*another = true;
			break;
		}
		*ret = NET_RX_SUCCESS;
		return NULL;
	case TC_ACT_SHOT:
		kfree_skb_reason(skb, drop_reason);
		*ret = NET_RX_DROP;
		return NULL;
	/* used by tc_run */
	case TC_ACT_STOLEN:
	case TC_ACT_QUEUED:
	case TC_ACT_TRAP:
		consume_skb(skb);
		fallthrough;
	case TC_ACT_CONSUMED:
		*ret = NET_RX_SUCCESS;
		return NULL;
	}
	return skb;
}

// bpf_redirect_peer bpf_redirect_neigh bpf_redirect
// 这三个函数都会修改per cpu变量 bpf_redirect_info的值
// 然后skb_do_redirect作为总入口根据不同的flag做不同的处理
int skb_do_redirect(struct sk_buff *skb)
{
	struct bpf_redirect_info *ri = this_cpu_ptr(&bpf_redirect_info);
	struct net *net = dev_net(skb->dev);
	struct net_device *dev;
	u32 flags = ri->flags;
	dev = dev_get_by_index_rcu(net, ri->tgt_index);
	if (flags & BPF_F_PEER) {
    // 该flag在执行ebpf帮助函数bpf_redirect_peer时会赋值
		const struct net_device_ops *ops = dev->netdev_ops;
		dev = ops->ndo_get_peer_dev(dev);
		skb->dev = dev;
		return -EAGAIN;
	}
	return flags & BPF_F_NEIGH ?
	       __bpf_redirect_neigh(skb, dev, flags & BPF_F_NEXTHOP ?
				    &ri->nh : NULL) :
	       __bpf_redirect(skb, dev, flags);
}
```

上面的转发逻辑涉及如下三个函数，这些函数的作用不同，由ebpf prog执行。  

1. `bpf_redirect_peer`   参数是veth网卡在host的ifindex, 用于传发到veth的对端设备，即容器里的网卡。
2. `bpf_redirect_neigh`  参数是要发送报文的网卡ifdex, 直接通过tx方向的发送出去
3. `bpf_redirect`        最早的转发函数

假设主网卡是eth0, POD在host的网卡为veth-host, 在容器里的网卡为veth-container,如下表格整理了三个函数的
使用场景，特点和内核中的不同调用路径。

| 转发函数 | 场景&特点 | 包路径转移 |
| :--- | :--- | :----
| bpf_redirect_peer | 场景：从主网卡接受的消息直接转发到容器里的网卡。<br> 特点：<br> 不进入cpu backlog <br> prog维护L2层mac数据 | eth0 ingress --> veth-container ingress|
| bpf_redirect_neigh | 场景：容器出方向消息通过主网卡转发 <br>特点：<br> prog无需维护L2层mac数据，内核自动通过邻居子系统完成。 | veth-host ingress --> eth0 egress|
| bpf_redirect | 场景：以上两个都支持。<br>特点：<br> 需要prog维护好L2层mac数据 | 相比 bpf_redirect_peer ， 路径为 eth0 ingress --> veth-host egress --> cpu backlog --> veth-container ingress  <br> 相比 bpf_redirect_neigh ， 路径相同，但需要自行维护L2的mac数据|

继续看三个函数运行后如何影响包的传递：  

`bpf_redirect_peer`：
L2层mac数据需要prog提前修改好。  
获取容器空间里网卡的dev, 修改 skb->dev=dev后返回-EAGAIN。  
相当于从 网卡的ingress 跳到另一个网卡的 rx ingress路径。 前面的tc ingress代码已有相关的解释。  

bpf_redirect_neigh  
进入内核的邻居子系统，自动选择neigh并填充L2层mac数据，并进入转发网卡的 egress路径。  
``` c
__bpf_redirect_neigh()
  // sch_handle_ingress push过，这里重新pull, 因为后续通过邻居子系统自动确认L2信息并填充。
  skb_pull(skb, sizeof(*ethh))  
  __bpf_redirect_neigh_v4()
    bpf_out_neigh_v4()
      skb->dev = dev
      ip_neigh_for_gw()   // 根据目的IP查找neigh
      neigh_output()      // 走内核正常的L2发送流程。 后续流程和普通发包一致。
        neigh_hh_output()
          __skb_push(skb, hh_len) // 之前pull,所以这里填充新的L2后push下
          dev_queue_xmit()
            __dev_queue_xmit()
              sch_handle_egress()  // 进入tc 方向的egress, 可能执行bpf prog
              __dev_xmit_skb() //进入 网卡tx方向的 qdisc, 后续有抓包相关的函数

```

`bpf_redirect`: 
L2层mac数据需要prog提前修改好。  
``` c
__bpf_redirect()
  __bpf_redirect_common()
    __bpf_tx_skb()
      skb->dev = dev
      dev_queue_xmit() // 也进入到正常的tx 发包流程。
```


#### egress
TC层egress在内核侧的处理主要在`sch_handle_egress`函数里，cilium主要在这块处理带宽管理，snat相关的逻辑。  
以下的简化的代码处理逻辑：  
``` c
int __dev_queue_xmit(struct sk_buff *skb, struct net_device *sb_dev)
{
	struct net_device *dev = skb->dev;
	struct netdev_queue *txq = NULL;
	struct Qdisc *q;
	int rc = -ENOMEM;
	bool again = false;

#ifdef CONFIG_NET_EGRESS
	if (static_branch_unlikely(&egress_needed_key)) {
		skb = sch_handle_egress(skb, &rc, dev);
		if (!skb)
			goto out;
	}
#endif

	if (!txq)
		txq = netdev_core_pick_tx(dev, skb, sb_dev);

	q = rcu_dereference_bh(txq->qdisc);

	trace_net_dev_queue(skb);
	if (q->enqueue) {
		rc = __dev_xmit_skb(skb, q, dev, txq);
		goto out;
	}
out:
	return rc;
}
```

### 东西方向流量
有了SocketLB, 那么POD访问clusterIP或者POD的网络发包在内核网络里是一样的。  

#### POD --> ClusterIP/POD


POD访问clusterIP或者POD的整体网络路径图。 这里介绍目标POD在其他node节点。如果LB选择的后端POD就在
本地，那么就不需要将消息发到主网卡eth0, 直接在内核里完成转发。
![POD访问ClusterIP网络路径图](/img/cilium-pod-clusterip.svg)  


代码分析前，先介绍常见的变量名称：
```
router_mac   veth网卡在主机空间里的mac
lxc_mac      veth网卡在容器空间里的mac
```
包从pod的eth0网卡发出去后，会在主机侧lxc网卡的ingress方向收到。cilium的所有逻辑都挂在主机的lxc网卡，不会
挂在POD内的网卡。  
以下代码分析pod出去的包在lxc网卡ingress方向的处理：
``` c
cil_from_container()                  // 重置queue_mapping并赋值为endpointID，针对pod限速会用到。
  tail_handle_ipv4()                  // tail call, 如果执行就不返回
    __tail_handle_ipv4()
      tail_ipv4_ct_egress()           // lookup CT, scope为 dir 会查找两次，第二次swap ct key。结果存入buffer里
        tail_handle_ipv4_cont()
          handle_ipv4_from_lxc()      // policy通过后,如果lookup CT结果为new则创建CT
            policy_can_egress4()      // 检查出方向是否匹配policy
            __lookup_ip4_endpoint()   // 检查目的IP是否是本地endpoint
            ipv4_local_delivery()     // 如果是，则走本地转发流程
              ipv4_l3()               // 修改报文的L2层为 route_mac --> lxc_mac
              local_delivery()           
                accept()              // 非host来的入方向流量判断是否限速
                tail_call_policy()    // tail call, 如果执行就不返回
                  cil_lxc_policy()
                    tail_ipv4_ct_ingress_policy_only()  // 查CT， 结果为New
                      tail_ipv4_policy()
                        ipv4_policy()            // 检查通过后新流量会创建CT
                          policy_can_ingress4()  // 检查入方向是否匹配policy
                        redirect_ep()      
                          ctx_redirect_peer()  //通过bpf_redirect_peer完成转发
            fib_redirect_v4()         // 如果不是本地endpoit，走bpf_redirect_neigh转发
```

如果目的不是本地endpoint,则转发到主网卡eth0的egress， 这块也有prog, 但对于目的是IP是POD的处理很简单，如果没达到出
方向限速，就直接发出去。 在POD访问集群外IP时会看到一些伪装snat的业务逻辑。  具体eth0 egress流程如下：

``` c
cil_to_netdev()          
  edt_sched_departure()                  // 判断是否需要限速
  handle_nat_fwd()
    handle_nat_fwd_ipv4()
      __handle_nat_fwd_ipv4()
        nodeport_rev_dnat_fwd_ipv4()     // CT没有信息，返回CTX_ACT_OK
      tail_handle_snat_fwd_ipv4()        // tail call, 如果执行就不返回
        nodeport_snat_fwd_ipv4()         // 返回CTX_ACT_OK， 整个流程完成。
          snat_v4_needs_masquerade()     // 没有snat信息，返回NAT_PUNT_TO_STACK
```


以下代码分析主机网卡eth0接受到目的是POD的情况（非回程消息，远端node收到pod->pod的报文）：  
目的是nodeport的情况在南北方向流量会有说明。  
``` c
cil_from_netdev()       
  do_netdev()
    tail_handle_ipv4_from_netdev()                // tail call, 如果执行就不返回
      tail_handle_ipv4()
        handle_ipv4()
          nodeport_lb4()                          // ctx_skip_nodeport()结果是false, 进入这里                     
            tail_nodeport_nat_ingress_ipv4()      // tail call, 如果执行就不返回
              snat_v4_rev_nat()                   // 查snat表，不匹配返回 NAT_PUNT_TO_STACK
              ctx_skip_nodeport_set()             // ctx->tc_index 设置skip_nodeport
              tail_handle_ipv4_from_netdev()      // tail call, 如果执行就不返回
                tail_handle_ipv4()
                  handle_ipv4()                   // 与之前的不同，因设置skip nodeport而返回 CTX_ACT_OK
                  tail_handle_ipv4_cont_from_netdev()
                    tail_handle_ipv4_cont()
                      handle_ipv4_cont()
                        // 查询是否为本地endpoint
                        // 是则进入lookup_ip4_endpoint处理
                        // 不是则return进入内核正常协议栈去处理
                        lookup_ip4_endpoint()     
                        ipv4_local_delivery()     
                          ipv4_l3()               // 修改报文的L2层为 route_mac --> lxc_mac
                          local_delivery()           
                            accept()              // 非host来的入方向流量判断是否限速
                            tail_call_policy()    // tail call, 如果执行就不返回
                              cil_lxc_policy()
                                tail_ipv4_ct_ingress_policy_only()  // 查CT， 结果为New
                                  tail_ipv4_policy()  
                                    ipv4_policy()                   // 新流量则创建CT
                                      policy_can_ingress4()  // 检查入方向是否匹配policy
                                    redirect_ep()      
                                      ctx_redirect_peer()    //通过bpf_redirect_peer完成转发
```

#### POD --> 集群外IP

和POD--> ClusterIP/POD 的区别在于，当离开node时，需要Masquerading（伪装）。

![POD访问集群外网络路径图](/img/cilium-pod-outside.svg)  


``` c
cil_to_netdev()           // hook在主网卡的egress
  edt_sched_departure()   // 判断下是否需要限速
  handle_nat_fwd()
    handle_nat_fwd_ipv4()
      __handle_nat_fwd_ipv4()
        nodeport_rev_dnat_fwd_ipv4()   //  返回NULL,因为没有ct信息
        tail_handle_snat_fwd_ipv4()    // tail call, 如果执行就不返回
          nodeport_snat_fwd_ipv4()     // 返回0， 如果做了snat, 会执行ctx_snat_done_set(ctx)
            snat_v4_init_tuple()       // 初始化 tuple
            __lookup_ip4_endpoint()      // 检查源IP是否是本地endpoint
            // 目的IP是否在POD CIDR内
            // 源ep是否是host的
            // 目的IP是否在ip-masq-agent配置的表内
            // 目的IP是否remote node
            // 如果是上面4个场景满足任意一个，不需要伪装
            // 否则返回 NAT_NEEDED
            snat_v4_needs_masquerade()   
              ipv4_is_in_subnet()        // 判断目的IP是不是PODCIDR,是则不需要伪装
            snat_v4_nat()                // 执行snat
              ipv4_load_l4_ports()       // 提取port信息
              ipv4_ct_tuple_swap_ports() // 反转成正确的信息
              __snat_v4_nat()
                snat_v4_nat_handle_mapping()
                  get_cluster_snat_map_v4()  // 获取map cilium_snat_v4_external
                  __snat_lookup()
                  snat_v4_new_mapping()
                    set_v4_rtuple()          // 生成创建sant信息时的tuple
                    __snat_create()          // 创建revSnat信息
                    __snat_create()          // 创建snat信息
                snat_v4_rewrite_headers()    // 根据nat信息，修改源IP和源端口
```

回程消息的处理如下：
``` c
cil_from_netdev()                    // hook在主网卡的ingress
  do_netdev()
    tail_handle_ipv4_from_netdev()   // tail call, 如果执行就不返回
      tail_handle_ipv4()
        handle_ipv4()
          nodeport_lb4()                          // 目的IP不是nodePort，走到下面的流程里       
            tail_nodeport_nat_ingress_ipv4()      // tail call, 如果执行就不返回
              snat_v4_rev_nat()                   // 生成tuple
                snat_v4_rev_nat_handle_mapping()  // 根据tuple尝试匹配revSnat和snat记录
                snat_v4_rewrite_headers()         // 匹配成功后修改包的目的ip+port, 返回 0
              ctx_snat_done_set()                 // ctx->mark 设置snat_done
              nodeport_rev_dnat_ipv4()            // 返回CTX_ACT_OK
                ct_lazy_lookup4()                 // CT_ENTRY_NODEPORT 不匹配，返回CT_NEW
              ctx_skip_nodeport_set()             // ctx->tc_index 设置skip_nodeport
              tail_handle_ipv4_from_netdev()      // tail call, 如果执行就不返回
              // 后续流程与 POD--> POD的一致。
```

### 南北向流量


#### 外部流量--> NodePort(选择的后端在本地)

![POD访问NodePort网络路径图](/img/cilium-other-nodeport-local.svg)  

网卡eth0收到消息后的处理流程如下：
``` c
cil_from_netdev()                    // hook在主网卡的ingress
  do_netdev()
    tail_handle_ipv4_from_netdev()   // tail call, 如果执行就不返回
      tail_handle_ipv4()
        handle_ipv4()
          nodeport_lb4()                          // 目的IP是nodePort，走到下面的流程里       
            lb4_lookup_service()                  // 找到svc
            nodeport_svc_lb4()
              lb4_local()                         // 
                lb4_lookup_backend()              // 随机选择一个后端
                ct_create4()                      // 创建CT
                lb4_xlate()                       // 修改报文的目的IP+Port,返回CTX_ACT_OK
              ct_create4()                        // 创建CT
        tail_handle_ipv4_cont_from_netdev()
        // 后续流程与 POD--> POD的一致。     
```


回程消息在主网卡eth0上面进行反向nat发出去。
``` c
cil_to_netdev()           // hook在主网卡的egress
  edt_sched_departure()   // 判断下是否需要限速
  handle_nat_fwd()
    handle_nat_fwd_ipv4()
      __handle_nat_fwd_ipv4()
        nodeport_rev_dnat_fwd_ipv4()   // 查询到nat后继续往下，最终返回CTX_ACT_OK
        ct_lazy_lookup4()              // 查CT信息，结果返回CT_REPLY
        __lb4_rev_nat()                // 报文执行revDnat转换，*snat_done = true
      ctx_snat_done_set(ctx)           // 设置 snat done
```


#### 外部流量--> NodePort(选择的后端不在本地)


![POD访问NodePort网络路径图](/img/cilium-other-nodeport-remote-node.svg)  

网卡eth0收到消息后的处理流程如下：
``` c
cil_from_netdev()                    // hook在主网卡的ingress
  do_netdev()
    tail_handle_ipv4_from_netdev()   // tail call, 如果执行就不返回
      tail_handle_ipv4()
        handle_ipv4()
          nodeport_lb4()                          // 目的IP是nodePort，走到下面的流程里       
            lb4_lookup_service()                  // 找到svc
            nodeport_svc_lb4()          
              lb4_local()                         // 
                lb4_lookup_backend()              // 随机选择一个后端
                ct_create4()                      // 创建CT
                lb4_xlate()                       // 修改报文的目的IP+Port,返回CTX_ACT_OK
              ct_create4()                        // 创建CT
              edt_set_aggregate()                 // 清零，确保tx方向不会被限速。
              tail_nodeport_nat_egress_ipv4()     // tail call, 如果执行就不返回上一层。
                __snat_v4_nat()                   // 提取tuple, 创建snat记录后修改报文
                ctx_snat_done_set()
                fib_redirect()                    // 转发出去   
```


![POD访问NodePort网络路径图](/img/cilium-other-nodeport-remote-node-reply.svg)  

网卡eth0收到回程消息后的处理流程如下：

``` c
cil_from_netdev()                    // hook在主网卡的ingress
  do_netdev()
    tail_handle_ipv4_from_netdev()   // tail call, 如果执行就不返回
      tail_handle_ipv4()
        handle_ipv4()
          nodeport_lb4()                          // 目的IP不是nodePort，走到下面的流程里       
            lb4_lookup_service()                  // 返回NULL
            tail_nodeport_nat_ingress_ipv4()      // tail call, 如果执行就不返回上一层。
              snat_v4_rev_nat()                   // 修改报文的目的端信息
              nodeport_rev_dnat_ipv4()            // 修改报文的源端信息
                ctx_snat_done_set(ctx);
                fib_redirect()                    // 转发出去
              edt_set_aggregate()                 // 清零，不限速
```