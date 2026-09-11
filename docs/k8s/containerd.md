
以下分析基于containerd 2.2.2


## 基本概念

kubelet 与 containerd 通过 CRI 交互  
containerd与容器网络插件通过CNI 交互  

kubelet 跟 containerd的 cgroup driver需要保持一致，建议systemd  

containerd 已daemon方式后台运行，容器是父进程时shim。 shim的父进程是pid 1的systemd.   
重启containerd不影响已有的容器运行。  

containerd内部的功能通过插件实现。image拉取后通过snapshot（内部概念）插件管理。 常用的是使用overlay将各层mount为
统一视图。  

ShimInstance 不是指shim进程， pause, 和 容器进程，都属于 ShimInstance。   
内部task是一组进程的抽象，也可以认为是一个runc实现。   

元数据存储使用bblot  

数据存放：  
持久化数据默认存放在`/var/lib/containerd`(rootDir)  
运行时数据存放在`/run/containerd`(stateDir)    


### CRI接口
kubelet与containerd通过CRI交互， CRI规范里定义了容器和镜像管理。 cri是基于GPRC的， 具体定义
参见[链接](https://github.com/kubernetes/cri-api/blob/v0.33.1/pkg/apis/runtime/v1/api.proto)




containerd运行后会生成`/run/containerd/containerd.sock`， kubelet通过命令行参数`--container-runtime-endpoint=unix:///run/containerd/containerd.sock`作为客户端连接到containerd, 然后遵循CRI规范与containerd交互。  

crictl 的也使用CRI接口与containerd交互，常用于调测，运维排障。

容器网络是containerd调用CNI插件完成。镜像也是containerd下载管理的。
containerd源码里通过`interface RuntimeServiceServer`表示服务段容器运行时相关的操作，通过`interface ImageServiceServer`表示
服务端镜像相关的操作。  


## 配置

配置文件`/etc/containerd/config.toml`

打开debug日志的方法：
在 /etc/containerd/config.toml 添加如下字段后重启containerd生效
``` yaml
[debug]
  level = "debug" 
```


runc的默认模版在/etc/containerd/cri-base.json  
`crictl info`可以看出使用systemdcgroup, runtimeType 是 runtimeType
是io.containerd.runc.v2， sandboxer使用podsandbox
``` bash
root@kind-worker2:/# crictl info | jq .config.containerd.runtimes.runc
{
  "ContainerAnnotations": null,
  "PodAnnotations": null,
  "baseRuntimeSpec": "/etc/containerd/cri-base.json",
  "cgroupWritable": false,
  "cniConfDir": "",
  "cniMaxConfNum": 0,
  "io_type": "",
  "options": {
    "BinaryName": "",
    "CriuImagePath": "",
    "CriuWorkPath": "",
    "IoGid": 0,
    "IoUid": 0,
    "NoNewKeyring": false,
    "Root": "",
    "ShimCgroup": "",
    "SystemdCgroup": true
  },
  "privileged_without_host_devices": false,
  "privileged_without_host_devices_all_devices_allowed": false,
  "runtimePath": "",
  "runtimeType": "io.containerd.runc.v2",
  "sandboxer": "podsandbox",
  "snapshotter": ""
}
```

插件在代码里通过两部分组成， type和 ID. `io.containerd.runtime.v2.task`里 type为`io.containerd.runtime.v2`， id 为`task`   

插件自身的数据会放到type+id目录下面。
``` bash
root@kind-worker2:/var/lib/containerd# ls
io.containerd.content.v1.content     io.containerd.runtime.v2.task             io.containerd.snapshotter.v1.native
io.containerd.grpc.v1.cri            io.containerd.sandbox.controller.v1.shim  io.containerd.snapshotter.v1.overlayfs
io.containerd.grpc.v1.introspection  io.containerd.snapshotter.v1.blockfile    tmpmounts
io.containerd.metadata.v1.bolt       io.containerd.snapshotter.v1.erofs
```



## 镜像管理


如果针对域名为quay.io的镜像做特殊配置，就要创建etc/containerd/certs.d/quay.io/hosts.toml文件。

已访问quay.io/cilium/cilium为例，根据下面的配置，会转换为访问https://quay.m.daocloud.io/cilium/cilium。
如果失败，则fallback到server字段的配置， 即https://quay.io/cilium/cilium
``` bash
# cat /etc/containerd/certs.d/quay.io/hosts.toml
server = "https://quay.io"
[host."https://quay.m.daocloud.io"]
  capabilities = ["pull", "resolve"]
  skip_verify = true
```

镜像由manifest 文件、config 文件以及文件系统层文件组成。
`crictl ps`里显示的 imageid其实是 config文件ID。 文件系统层格式为tar.gz. containerd拉取镜像后，会解压tar.gz将数据
存放在rootDir/io.containerd.content.v1.content 下
当容器启动时，会在io.containerd.snapshotter.v1.overlayfs/snapshots下面生成对应的目录。方便作为overlayfs的
lowdir。

``` bash
root@kind-worker2:/# crictl ps
CONTAINER           IMAGE               CREATED              STATE               NAME                     ATTEMPT             POD ID              POD                                       NAMESPACE
8d89be3224298       65232e320e58b       About a minute ago   Running             local-path-provisioner   0                   79a34d49b5945       local-path-provisioner-567f868bf9-ckdjc   local-path-storage
```

`crictl inspecti <image-ref>` 查到的各层diff_id, 并不是原始镜像里每个layers的ID，而是解压后tar的。

`ctr -n k8s.io image list -q` 返回image ref name
``` bash
root@kind-worker2:~# ctr -n k8s.io image list -q
docker.io/kindest/kindnetd:v20251212-v0.29.0-alpha-105-g20ccfc88
docker.io/kindest/local-path-helper:v20251211-v0.29.0-alpha-100-g82a92c5d
docker.io/kindest/local-path-provisioner:v20251212-v0.29.0-alpha-105-g20ccfc88
quay.io/cilium/cilium@sha256:42ec562a5ff6c8a860c0639f5a7611685e253fd9eb2d2fcdade693724c9166a4
quay.io/cilium/json-mock@sha256:5aad04835eda9025fe4561ad31be77fd55309af8158ca8663a72f6abb78c2603
```


如下命令查询镜像里每层的大小， 是tar的大小（也就是解压缩后的）
``` bash
root@kind-worker2:/# ctr -n k8s.io image usage quay.m.daocloud.io/cilium/cilium:v1.18.6
KEY                                                                     SIZE      INODES
sha256:b4abb501f4345c7d9716237df045aecb6fd2bb9e8fc6da370d16e0894f1ef80b 12.0 KiB  3
sha256:dce54c81257d77d3c9383a488014cd1980129578387ad4e02fa7c2781da1abc2 28.0 KiB  4
sha256:26ae750722aa11d85d5275740aa8b74f25a453e100ae3c75817cafb0cd02e42e 57.7 MiB  4
sha256:9d0674bb2c3e5ac029ce5bf17e3ba64ae793fbc22e1c41a49ae5a435b4c311ae 322.5 MiB 488
sha256:9a20bac8a6c06af4ca387171950dfec771c39b6f21e29115d9bc6592503ebf49 68.2 MiB  5
sha256:44032e6c1e4c8e27efcc75f8d72ee0ff5e8f02ebf6def7c389bb7af41c30dae3 25.6 MiB  4
sha256:3e9ce38979a0209355c8bf23302cfb5e49ed72a52bd52d4b02198011d0497cca 12.0 KiB  3
sha256:9f689b5d3657c1c43a17856326a7657320a5ce09b91129ac540c69325b71b8aa 225.2 MiB 5218
```

下面查询所有snothot的大小， sha256:xxx  为镜像的各层(xxx为diffid，由containerd内部计算)。  
不带 sha256的为容器可写层。key值就是containerdID或者podsandboxID。 该命令可以快速判断哪个
容器可写层size过大。
``` bash
root@kind-worker2:/# ctr -n k8s.io snapshot usage
KEY                                                                     SIZE      INODES
25d2ae5f0aa255ad7f98e0eb0b40ffb749d6b4a02828784631ad03b37cf1b045        44.0 KiB  9
26254b5996804584dd718aafa48ef0f2ef2dfee345bac70ca048d22f23196816        24.0 KiB  6
36ca5cedfa8afa851885cde8c16b49b9abcc24e56f59e699ad6135fe4966e6f6        204.0 KiB 43
48d5da43fd532391e45aa09f18a84678718328720ca75ba99a24b86e50e1ea32        36.0 KiB  7
4eb0c40aee0de570656b8b4f1dfefbc11ec595fe48df7636d1cef8856fa6dfee        44.0 KiB  9
724f1ef8d4300fe41873ac31649e763e0e0aa033f0f7131c6023da2361afd72e        52.0 KiB  11
7a5e478b5df4f86f6594104ecfa86938eeb2d3b97da228df4b4a72f6d0fad509        92.0 KiB  23
b2d1d6c033748f8ecbb3d7250090f99e22d4f5c4f02121d75244002ab05c0ba9        40.0 KiB  8
b75084ea634b60744158ec7850b77e11e5142e2a1dc97c34e13e51501df964c8        24.0 KiB  6
ea16465523afa66fc3bc2d353907b3add834d59345ae40a67e426df03340c492        44.0 KiB  9
sha256:25522075b32e2c554a77d75e31c7fc12236a57cce05cd6c98842276e5accafb8 1.8 MiB   2
sha256:26ae750722aa11d85d5275740aa8b74f25a453e100ae3c75817cafb0cd02e42e 57.7 MiB  4
```

## 日志管理
RunPodSandbox时把目录`/var/log/pods/<k8s-namespace>_<pod-name>_<pod-uuid>`创建好。
CreateContainer时指定在上述目录下创建`<container-name>/<restart-count>.log`

生成的命名管道
`stateDir/io.containerd.grpc.v1.cri/containers/<containerd-id>/io/<randomid>/<containerid>-[stdout|stderr]`
用于在containerd与shim之间传递容器自身标准输出/错误的日志。
shim与runc之间通过匿名管道交互。

下面信息显示容器xwing的父进程是shim 2141, 自身的进程是 2256
``` bash
root@kind-worker2:/# crictl ps | grep xwing
46f7b59c76eb4       adcc2d0552708       7 minutes ago       Running             spaceship                0                   d945cf2e98ede       xwing                                     default
root@kind-worker2:/# pstree -anspT 2141
systemd,1
  `-containerd-shim,2141 -namespace k8s.io -id d945cf2e98edeef8f692db2f665694061d46483813e743083ca8d2e99fe752dd -address/run/containerd/conta
      |-pause,2165
      `-tini,2256 -- /usr/local/bin/json-server --host  --port 80 --watch /default.json --middlewares/middleware.js
          `-node,2276 /usr/local/bin/json-server --host  --port 80 --watch /default.json --middlewares/middleware.js
```
容器进程 2256 的标准输出是匿名管道 pipe:[103410]
``` bash
root@kind-worker2:/# ls -rlt /proc/2256/fd/1
l-wx------. 1 root root 64 Sep  7 07:15 /proc/2256/fd/1 -> 'pipe:[103410]'
```
shim进程里从 pipe:[103410] 读，并写入到 `stateDir/io.containerd.grpc.v1.cri/containers/<containerd-id>/io/<randomid>/<containerid>-[stdout|stderr]`
``` bash
root@kind-worker2:/# ls -rlt /proc/2141/fd | grep -E "103410|stdout"
l---------. 1 root root 64 Sep  7 07:14 17 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
l---------. 1 root root 64 Sep  7 07:15 14 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
lr-x------. 1 root root 64 Sep  7 07:15 18 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
l-wx------. 1 root root 64 Sep  7 07:15 16 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
lr-x------. 1 root root 64 Sep  7 07:15 13 -> pipe:[103410]
```
containerd主进程从 `stateDir/io.containerd.grpc.v1.cri/containers/<containerd-id>/io/<randomid>/<containerid>-[stdout|stderr]` 读取，
并写入到`/var/log/pods/<k8s-namespace>_<pod-name>_<pod-uuid>/<container-name>/<restart-count>.log`
``` bash
root@kind-worker2:/# ls -rlt /proc/154/fd | grep "20ea-stdout"
lr-x------. 1 root root 64 Sep  7 07:14 73 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
l---------. 1 root root 64 Sep  7 07:14 71 -> /run/containerd/io.containerd.grpc.v1.cri/containers/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea/io/1873824010/46f7b59c76eb4fceaf1cf92b67216b0b7c1177ff53e167d6cb2799a952a020ea-stdout
```

`ReopenContainerLog`的过程：  
前提是kubelet已经将0.log日志改名，rename 不影响容器日志的继续写入。（同时kubelet也负责对历史的文件压缩）  
1. 创建新的0.log，生成对应的pipe  
2. 修改containerd里的容器配置，让其从`<containerid>-[stdout|stderr]`获取的信息写入的上述新的pipe.  


## 源码介绍

### RunPodSandbox

启动sandbox

输入：POD的name, uid, namespace, Attempt值(也就是restart值)，POD日志目录，dns配置，镜像，cgroup目录，资源配置等。  
restart值代表之前重启过的次数。 比如1， 代表之前重启过1次， 然后这次的容器日志默认就是 1.log  

主要步骤：  
准备新的网络空间  
启动shim  
创建并启动pause容器  

详细日志：  
```
Aug 21 07:28:16 kind-worker2 containerd[2127]: time="2026-08-21T07:28:16.900956920+08:00" level=info msg="RunPodSandbox for name:\"xwing\"  uid:\"efa146e2-0e40-4984-a1d0-0f0d745d3440\"  namespace:\"default\""
Aug 21 07:28:16 kind-worker2 containerd[2127]: time="2026-08-21T07:28:16.901059763+08:00" level=debug msg="Sandbox config metadata:{name:\"xwing\"  uid:\"efa146e2-0e40-4984-a1d0-0f0d745d3440\"  namespace:\"default\"}  hostname:\"xwing\"  log_directory:\"/var/log/pods/default_xwing_efa146e2-0e40-4984-a1d0-0f0d745d3440\"  dns_config:{servers:\"10.96.0.10\"  searches:\"default.svc.cluster.local\"  searches:\"svc.cluster.local\"  searches:\"cluster.local\"  searches:\"dns.podman\"  options:\"ndots:5\"}  labels:{key:\"app.kubernetes.io/name\"  value:\"xwing\"}  labels:{key:\"class\"  value:\"xwing\"}  labels:{key:\"io.kubernetes.pod.name\"  value:\"xwing\"}  labels:{key:\"io.kubernetes.pod.namespace\"  value:\"default\"}  labels:{key:\"io.kubernetes.pod.uid\"  value:\"efa146e2-0e40-4984-a1d0-0f0d745d3440\"}  labels:{key:\"org\"  value:\"alliance\"}  annotations:{key:\"kubectl.kubernetes.io/last-applied-configuration\"  value:\"{\\\"apiVersion\\\":\\\"v1\\\",\\\"kind\\\":\\\"Pod\\\",\\\"metadata\\\":{\\\"annotations\\\":{},\\\"labels\\\":{\\\"app.kubernetes.io/name\\\":\\\"xwing\\\",\\\"class\\\":\\\"xwing\\\",\\\"org\\\":\\\"alliance\\\"},\\\"name\\\":\\\"xwing\\\",\\\"namespace\\\":\\\"default\\\"},\\\"spec\\\":{\\\"affinity\\\":{\\\"nodeAffinity\\\":{\\\"requiredDuringSchedulingIgnoredDuringExecution\\\":{\\\"nodeSelectorTerms\\\":[{\\\"matchExpressions\\\":[{\\\"key\\\":\\\"kubernetes.io/hostname\\\",\\\"operator\\\":\\\"In\\\",\\\"values\\\":[\\\"kind-worker2\\\"]}]}]}}},\\\"containers\\\":[{\\\"image\\\":\\\"quay.io/cilium/json-mock:v1.3.8@sha256:5aad04835eda9025fe4561ad31be77fd55309af8158ca8663a72f6abb78c2603\\\",\\\"name\\\":\\\"spaceship\\\"}]}}\\n\"}  annotations:{key:\"kubernetes.io/config.seen\"  value:\"2026-08-21T07:28:16.595270438+08:00\"}  annotations:{key:\"kubernetes.io/config.source\"  value:\"api\"}  linux:{cgroup_parent:\"/kubepods.slice/kubepods-besteffort.slice/kubepods-besteffort-podefa146e2_0e40_4984_a1d0_0f0d745d3440.slice\"  security_context:{namespace_options:{pid:CONTAINER  userns_options:{mode:NODE}}  seccomp:{}}  overhead:{}  resources:{cpu_period:100000  cpu_shares:2  unified:{key:\"memory.oom.group\"  value:\"1\"}}}"
```


调用栈：
``` go
instrumentedService.RunPodSandbox()
    criService.RunPodSandbox()
        util.GenerateID()                             // 生成唯一ID  
        criService.client.SandboxStore().Create()     // sandbox信息存储到 rootDir/io.containerd.metadata.v1.bolt/meta.db
        netns.NewNetNS(netnsMountDir)                 // 目录/var/run/netns下创建新建网络空间
        criService.setupPodNetwork()                  // 调用cni插件安装网络
        criService.sandboxService.CreateSandbox()
          Controller.Create()                         // podsandbox将信息存在内存里
            Store.Save()                              
        criService.sandboxService.StartSandbox()
          Controller.Start()
            Controller.ensureImageExists()            // 确保镜像存在
            Controller.os.MkdirAll()                  // rootDir/io.containerd.grpc.v1.cri/sandboxes
                                                      // stateDir/io.containerd.grpc.v1.cri/sandboxes 创建相应的文件夹
            Controller.sandboxContainerSpec()         // 将配置转换为spec
                                                      // 设置rootfs只读，配置cgroup路径, 调整OOMScoreAdj
                                                      // 增加/dev/shm, /etc/resolv.conf 两个挂载点
            customopts.WithNewSnapshot()              // sanbox的SnapshotKey为sanboxID,unpack image并建立容器可写层。
            Controller.client.NewContainer()
              Client.ContainerService().Create()      // 信息存储到 rootDir/io.containerd.metadata.v1.bolt/meta.db
            Controller.setupSandboxFiles()            // 在rootDir/io.containerd.grpc.v1.cri/sandboxes/<sandboxid> 
                                                      // 生成hosts, hostname, resolv.conf
                                                      // 在stateDir/io.containerd.grpc.v1.cri/sandboxes/<sandboxid> 
                                                      // 生成shm
            container.NewTask()
              container.handleMounts                     // 将snapshots信息转换为linux下面的mount格式
              container.client.TaskService().Create()
                PlatformRuntime.Create()
                  TaskManager.Create()
                    NewBundle()                          // 准备bundle环境，用于存放config.json等
                                                         // path为stateDir/io.containerd.runtime.v2.task/k8s.io/<id>
                    TaskManager.mounts.Activate()        // mount rootfs
                    TaskManager.manager.Start()          // 启动shime, 有opts.SandboxID， 则为容器，不单独启动Shim
                                                         // 没有opts.SandboxID，说明是sandbox, 需要启动shim进程
                      ShimManager.startShim()            // 调用外部进程containerd-shim-runc-v2
                                                         //  参数为 -id xx start， 写信息到文件shim-binary-path，bootstrap.json
                                                         // 返回的信息为 ttrpc+unix://<uds-path>
                    shimTask.Create()                    // 准备request(含bundle, id等信息)
                      shimTask.task.Create()             // 作为客户端，把创建信息发给shim进程， shim调用runc完成容器创建

```


### CreateContainer
创建容器

输入：sandboxID， 容器name, 镜像ID，环境变量，mount挂载信息，容器日志path, cgroup目录，资源配置等。  

如下信息表示容器使用独立的新的pid空间。  
`security_context:{namespace_options:{pid:CONTAINER  userns_options:{mode:NODE}}`

主要步骤：  
在内存里生成新容器的相关信息后返回，并不启动容器。  
/dev/shm, /etc/hostname and /etc/resolv.conf bind sandbox生成的文件  
/etc/hosts的源是kubelet传入的参数值  

详细日志：
```
Aug 27 06:47:30 kind-worker2 containerd[2146]: time="2026-08-27T06:47:30.461392332+08:00" level=info msg="CreateContainer within sandbox \"afb75b1448f76af7f48628ea50d4669cbff72d651cac0f56ca77d98ad934decc\" for container name:\"spaceship\""
Aug 27 06:47:30 kind-worker2 containerd[2146]: time="2026-08-27T06:47:30.461499546+08:00" level=debug msg="Container config metadata:{name:\"spaceship\"}  image:{image:\"sha256:adcc2d0552708b61775c71416f20abddad5fd39b52eb4ac10d692bd19a577edb\"  user_specified_image:\"quay.io/cilium/json-mock:v1.3.8@sha256:5aad04835eda9025fe4561ad31be77fd55309af8158ca8663a72f6abb78c2603\"}  envs:{key:\"KUBERNETES_PORT_443_TCP_ADDR\"  value:\"10.96.0.1\"}  envs:{key:\"KUBERNETES_SERVICE_HOST\"  value:\"10.96.0.1\"}  envs:{key:\"KUBERNETES_SERVICE_PORT\"  value:\"443\"}  envs:{key:\"KUBERNETES_SERVICE_PORT_HTTPS\"  value:\"443\"}  envs:{key:\"KUBERNETES_PORT\"  value:\"tcp://10.96.0.1:443\"}  envs:{key:\"KUBERNETES_PORT_443_TCP\"  value:\"tcp://10.96.0.1:443\"}  envs:{key:\"KUBERNETES_PORT_443_TCP_PROTO\"  value:\"tcp\"}  envs:{key:\"KUBERNETES_PORT_443_TCP_PORT\"  value:\"443\"}  mounts:{container_path:\"/var/run/secrets/kubernetes.io/serviceaccount\"  host_path:\"/var/lib/kubelet/pods/4b413a64-50e8-458b-aa70-adb76a4d10b0/volumes/kubernetes.io~projected/kube-api-access-8xhkd\"  readonly:true}  mounts:{container_path:\"/etc/hosts\"  host_path:\"/var/lib/kubelet/pods/4b413a64-50e8-458b-aa70-adb76a4d10b0/etc-hosts\"}  mounts:{container_path:\"/dev/termination-log\"  host_path:\"/var/lib/kubelet/pods/4b413a64-50e8-458b-aa70-adb76a4d10b0/containers/spaceship/bdc5ed30\"}  labels:{key:\"io.kubernetes.container.name\"  value:\"spaceship\"}  labels:{key:\"io.kubernetes.pod.name\"  value:\"xwing\"}  labels:{key:\"io.kubernetes.pod.namespace\"  value:\"default\"}  labels:{key:\"io.kubernetes.pod.uid\"  value:\"4b413a64-50e8-458b-aa70-adb76a4d10b0\"}  annotations:{key:\"io.kubernetes.container.hash\"  value:\"b71974ec\"}  annotations:{key:\"io.kubernetes.container.restartCount\"  value:\"0\"}  annotations:{key:\"io.kubernetes.container.terminationMessagePath\"  value:\"/dev/termination-log\"}  annotations:{key:\"io.kubernetes.container.terminationMessagePolicy\"  value:\"File\"}  annotations:{key:\"io.kubernetes.pod.terminationGracePeriod\"  value:\"30\"}  log_path:\"spaceship/0.log\"  linux:{resources:{cpu_period:100000  cpu_shares:2  oom_score_adj:1000  hugepage_limits:{page_size:\"2MB\"}  hugepage_limits:{page_size:\"1GB\"}  unified:{key:\"memory.oom.group\"  value:\"1\"}  unified:{key:\"memory.swap.max\"  value:\"0\"}}  security_context:{namespace_options:{pid:CONTAINER  userns_options:{mode:NODE}}  run_as_user:{}  masked_paths:\"/proc/asound\"  masked_paths:\"/proc/acpi\"  masked_paths:\"/proc/interrupts\"  masked_paths:\"/proc/kcore\"  masked_paths:\"/proc/keys\"  masked_paths:\"/proc/latency_stats\"  masked_paths:\"/proc/timer_list\"  masked_paths:\"/proc/timer_stats\"  masked_paths:\"/proc/sched_debug\"  masked_paths:\"/proc/scsi\"  masked_paths:\"/sys/firmware\"  masked_paths:\"/sys/devices/virtual/powercap\"  masked_paths:\"/sys/devices/system/cpu/cpu0/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu1/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu2/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu3/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu4/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu5/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu6/thermal_throttle\"  masked_paths:\"/sys/devices/system/cpu/cpu7/thermal_throttle\"  readonly_paths:\"/proc/bus\"  readonly_paths:\"/proc/fs\"  readonly_paths:\"/proc/irq\"  readonly_paths:\"/proc/sys\"  readonly_paths:\"/proc/sysrq-trigger\"  seccomp:{profile_type:Unconfined}}}"
```

调用栈：
``` go
instrumentedService.CreateContainer()
    criService.CreateContainer()
        util.GenerateID()                           // 生成唯一ID  
        criService.LocalResolve(config.GetImage().GetImage())  // 获取镜像信息
        criService.createContainer()                        
          criService.os.MkdirAll()                  // rootDir/io.containerd.grpc.v1.cri/containers
                                                    // stateDir/io.containerd.grpc.v1.cri/containers 创建相应的文件夹
          criService.buildContainerSpec()           // 创建oci spec
            criService.linuxContainerMounts()       // 增加 /dev/shm, /etc/hostname and /etc/resolv.conf mount信息
                                                    // source从 rootDir/io.containerd.grpc.v1.cri/sandboxs/<id>/ 获取
                                                    // /etc/hosts信息由kubelet传入
            criService.buildLinuxSpec()             // 环境变量，mount信息（重新挂载Cgroup),cgroup目录
              customopts.WithPodNamespaces()        // 配置容器的namespace使用/proc/<sandbox pid>/ns下面的文件（pause进程)
                                                    // network, ipc, uts,  但pid 是单独的
          customopts.WithNewSnapshot()              // container的SnapshotKey为containerID,unpack image并建立容器可写层。
          filepath.Join(r.podSandboxConfig.GetLogDirectory(), r.containerConfig.GetLogPath())  // 生成容器的日志文件
          cio.WithNewFIFOs()                        // 创建io管道符文件
                                                    // stateDir/io.containerd.grpc.v1.cri/containers/<id>/io/<randomid>/<id>-[stdout|stderr]
          containerstore.NewContainer               // 在内存里生成新容器信息

```



### StartContainer

在具体的sandbox里启动容器。

输入：容器ID。

主要步骤：  
获取spec信息，生成bundle目录  
overlay挂载rootfs  
通过trpc发消息给shim, shim调用runc 启动容器  

详细日志：
```
Sep 01 07:03:56 kind-worker2 containerd[1672]: time="2026-09-01T07:03:56.872992355+08:00" level=info msg="StartContainer for \"144cb22ef532dfe7faeec72bc462c890dbff2f0b4c9e1e646ef5f7b49b5089a6\""
Sep 01 07:03:56 kind-worker2 containerd[1672]: time="2026-09-01T07:03:56.873077780+08:00" level=debug msg="Start writing stream \"stdout\" to log file \"/var/log/pods/default_xwing_d62fd057-c497-4bf3-b4e2-f2701258934e/spaceship/0.log\""
Sep 01 07:03:56 kind-worker2 containerd[1672]: time="2026-09-01T07:03:56.873090745+08:00" level=debug msg="Start writing stream \"stderr\" to log file \"/var/log/pods/default_xwing_d62fd057-c497-4bf3-b4e2-f2701258934e/spaceship/0.log\""
```

调用栈：
``` go
instrumentedService.StartContainer()
    criService.StartContainer()
        criService.containerStore.Get(r.GetContainerId())       // 通过ID获取容器的所有信息
        container.NewTask()                                     // 生成IO相关的管道符等信息
        container.client.TaskService().Create(ctx, request)
          local.Create()
            TaskManager.Create()
              NewBundle()                                       // bundle是runc的主目录,创建rootfs子目录，写config.json
                                                                // stateDir/io.containerd.runtime.v2.task/k8s.io/<id> 
              TaskManager.mounts.Activate                       // 挂载overlay容器可写层
              TaskManager.manager.Start                         // 根据sandboxID找到跟shim可通信的trpc地址
              shimTask.Create()                   // 准备request(含bundle, id等信息)
                shimTask.task.Create()            // 作为客户端，把创建信息发给shim进程， shim调用runc完成容器创建
```


### StopContainer

停止容器。

输入：容器ID, 信号超时时间  
 
主要步骤：  
先发terminated信号，30s内没结束再发kill信号。  
进程停止，收到exit事件后 `runc delete`清理cgroup等资源。 删除bundle， 但容器可写层还在。  

详细日志：
```
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.086753459+08:00" level=info msg="StopContainer for \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\" with timeout 30 (s)"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.087050997+08:00" level=info msg="Stop container \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\" with signal terminated"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092157825+08:00" level=debug msg="Finish piping stderr of container \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092175121+08:00" level=debug msg="Finish redirecting stream \"stderr\" to log file \"/var/log/pods/default_xwing_75d0c72f-9341-4e51-89e9-2108f6131728/spaceship/0.log\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092155771+08:00" level=debug msg="Finish piping stdout of container \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092167817+08:00" level=debug msg="Finish redirecting stream \"stdout\" to log file \"/var/log/pods/default_xwing_75d0c72f-9341-4e51-89e9-2108f6131728/spaceship/0.log\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092224757+08:00" level=debug msg="Finish redirecting log file \"/var/log/pods/default_xwing_75d0c72f-9341-4e51-89e9-2108f6131728/spaceship/0.log\", closing it"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.092935767+08:00" level=info msg="received container exit event container_id:\"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\"  id:\"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\"  pid:1848  exit_status:143  exited_at:{seconds:1788477940  nanos:92728290}"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.122981957+08:00" level=info msg="StopContainer for \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\" returns successfully"
```

调用栈：
``` go
instrumentedService.StopContainer()
    criService.StopContainer()
        criService.containerStore.Get(r.GetContainerId())       // 通过ID获取容器的所有信息
        criService.stopContainerRetryOnConnectionClosed()
          criService.stopContainer()
            container.Container.Task()                          // 获取该容器对应的task
            task.Kill(ctx, sig)                                 // 发送SIGTERM信号
              process.task.client.TaskService().Kill()          // 发送kill指令到shim
            criService.waitContainerStop()                      // 等待term信号是否超时，如果超时，使用kill信号
            task.Kill(ctx, syscall.SIGKILL)  
            criService.waitContainerStop()                      // 继续等待kill信号的处理结果                   
```

另一个goroutine接收到`received container exit event`后执行清理动作

``` go
criService.handleContainerExit()
  task.Delete()
    t.client.TaskService().Delete()
      TaskManager.Delete()
        shimTask.delete()   // 参数 sandboxed 为true,    调用 runc delete
          shimTask.ShimInstance.Delete()  // 清理bundle
  cntr.Status.UpdateSync()  // 更新status信息，含退出时间，退出码
```

### StopPodSandbox

停止sandbox  

输入：sandboxID  

主要步骤：  
发kill信号给pause进程  
释放网络空间   
另一个goroutin监听到sandbox退出后的操作：   
  1. 通过trpc发消息给shim,让其执行runc delete 执行清理，   
  2. 通过trpc发消息给shim,让其执行shutdown操作，这样shim进程会自行结束。   
  3. 关闭客户端  
  4. 运行`containerd-shim-runc-v2 -id xxx -bundle xxx delete`
  5. 删除work, umount rootfs, 删除整个bundle目录   

详细日志：
```
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.123283643+08:00" level=info msg="StopPodSandbox for \"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.123313770+08:00" level=info msg="Container to stop \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\" must be in running or unknown state, current state \"CONTAINER_EXITED\""
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.127162293+08:00" level=info msg="received sandbox exit event container_id:\"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\"  id:\"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\"  exit_status:137  exited_at:{seconds:1788477940  nanos:127052734}" monitor_name=podsandbox
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.149204094+08:00" level=info msg="shim disconnected" id=4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a namespace=k8s.io
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.149286899+08:00" level=info msg="cleaning up after shim disconnected" id=4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a namespace=k8s.io
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.149295257+08:00" level=info msg="cleaning up dead shim" id=4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a namespace=k8s.io
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.153706719+08:00" level=warning msg="warnings while cleaning up dead shim" id=4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a namespace=k8s.io warnings="time=\"2026-09-04T07:25:40+08:00\" level=debug msg=\"starting signal loop\" namespace=k8s.io pid=1928 runtime=io.containerd.runc.v2\n"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.154160670+08:00" level=info msg="received sandbox container exit event sandbox_id:\"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\"  exit_status:137  exited_at:{seconds:1788477940  nanos:127052734}" monitor_name=criService
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.184189296+08:00" level=info msg="TearDown network for sandbox \"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\" successfully"
Sep 04 07:25:40 kind-worker2 containerd[1288]: time="2026-09-04T07:25:40.184220871+08:00" level=info msg="StopPodSandbox for \"4affbad53fc627fcb01cf99e480609e5704083f4c0dc349622070675e70ff27a\" returns successfully"
```

调用栈：
``` go
instrumentedService.StopPodSandbox()
    criService.StopPodSandbox()
        criService.sandboxStore.Get(r.GetPodSandboxId())         // 根据Sandboxid获取配置信息
        criService.stopPodSandbox()
          criService.stopContainerRetryOnConnectionClosed()      // 遍历所有sanbox关联的普通容器，如果有，强制stop
          criService.sandboxService.StopSandbox()                // 调用podsandbox下面的函数
            Controller.Stop()
              Controller.stopSandboxContainerRetryOnConnectionClosed()
                Controller.stopSandboxContainer()
                  task.Kill(ctx, syscall.SIGKILL)                // 直接发送kill信号
              Controller.cleanupSandboxFiles()                   // 仅 umount shm文件
          criService.teardownPodNetwork()                        // 调用cni插件释放网络配置
          sandbox.NetNS.Remove()                                 // umount netns并删除网络空间文件                           
```

sandbox在start阶段会创建goroutine监控退出事件
``` go
Controller.waitSandboxExit()
  handleSandboxTaskExit()
    task.Delete()
      task.client.TaskService().Delete()
        TaskManager.Delete()
          shimTask.delete()                   // 参数sandboxed为false,会执行s.waitShutdown操作
            s.task.Delete()                   // ttrpc给shim, 让其运行 runc delete 删除相关资源（比如Cgroup)
            s.waitShutdown()
              s.task.Shutdown()               // ttrpc给shim,让其执行shutdown, shim会执行shutdownService.Shutdown() 关闭unix socket
            s.ShimInstance.Delete()
              ttrpcClient.Close()             // 关闭客户端，异步触发onclose的回调函数
              ttrpcClient.UserOnCloseWait()   // block, 等待onclose执行完毕
              s.bundle.Delete()
```

onclose的回调函数主要过程：
``` go
		log.G(ctx).WithField("id", id).Info("shim disconnected")
		cleanupAfterDeadShim()
      binaryCall.Delete(ctx)          //运行 containerd-shim-runc-v2 -id xxx -bundle xxx delete
        b.bundle.Delete()             //删除work, umount rootfs, 删除整个bundle目录
		m.shims.Delete(ctx, id)           //内存中删除该task
```

shim进程收到shutdown请求后，关闭unix socket, ctx.Done()就不在block, 直接返回。 最终shim正常退出（退出码 0）
``` go
func run(ctx context.Context, manager Manager, config Config) error {
  ctx, sd := shutdown.WithShutdown(ctx)
  serve(ctx, server, signals, sd.Shutdown, pprofHandler)
    reap(ctx, logger, signals)
      	for {
          select {
          case <-ctx.Done():
            return ctx.Err()
        }
}
```

`containerd-shim-runc-v2 -id xxx -bundle xxx delete`  会调用`runc delete` 清理pause容器

### RemoveContainer

删除容器  

输入：containerID  


主要步骤：  
异步清理容器可写层，即active snapshot  
删除文件 `rootDir/io.containerd.grpc.v1.cri/containers/<id>/status`  
清理并删除目录 `rootDir/io.containerd.grpc.v1.cri/containers/<id>`  
清理并删除目录 `stateDir/io.containerd.grpc.v1.cri/containers/<id>`  

`/var/log/pods/` 下面的日志，由kubelet控制并删除。  

详细日志：
```
Sep 04 07:25:41 kind-worker2 containerd[1288]: time="2026-09-04T07:25:41.109548311+08:00" level=info msg="RemoveContainer for \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\""
Sep 04 07:25:41 kind-worker2 containerd[1288]: time="2026-09-04T07:25:41.112404679+08:00" level=info msg="RemoveContainer for \"d6542dead0a419efd1caaa5414b0429d5929b359a89f8069d83279074f2325e8\" returns successfully"
```

调用栈：
``` go
instrumentedService.RemoveContainer()
    criService.RemoveContainer()
      criService.containerStore.Get()                            // 获取容器配置信息
      setContainerRemoving()                                     // status.Removing = true , 防止其他进程并发
      container.Container.Delete(ctx, containerd.WithSnapshotCleanup)     //要求异步删除rootfs snapshot 
        container.client.ContainerService().Delete(ctx, c.id)    // 更新元数据
        container.Delete()                                       // 删除rootDir/io.containerd.grpc.v1.cri/containers/<id>/status 
        ensureRemoveAll(ctx, containerRootDir)                   // umount所有已containerRootDir为前缀的目录，并删除containerRootDir
        ensureRemoveAll(ctx, volatileContainerRootDir)           // umount所有已volatileContainerRootDir为前缀的目录，并删除volatileContainerRootDir
```



### RemovePodSandbox

删除sandbox  

输入：sandboxID  

主要步骤：  
清理并删除目录 `rootDir/io.containerd.grpc.v1.cri/sandboxs/<id>`  
清理并删除目录 `stateDir/io.containerd.grpc.v1.cri/sandboxs/<id>`  
异步清理容器可写层，即active snapshot  

详细日志：
```
Sep 07 21:15:06 kind-worker2 containerd[1765]: time="2026-09-07T21:15:06.879220994+08:00" level=info msg="RemovePodSandbox for \"fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec\""
Sep 07 21:15:06 kind-worker2 containerd[1765]: time="2026-09-07T21:15:06.879239301+08:00" level=info msg="Forcibly stopping sandbox \"fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec\""
Sep 07 21:15:06 kind-worker2 containerd[1765]: time="2026-09-07T21:15:06.896691403+08:00" level=info msg="TearDown network for sandbox \"fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec\" successfully"
Sep 07 21:15:06 kind-worker2 containerd[1765]: time="2026-09-07T21:15:06.898460279+08:00" level=info msg="Ensure that sandbox fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec in task-service has been cleanup successfully"
Sep 07 21:15:06 kind-worker2 containerd[1765]: time="2026-09-07T21:15:06.901177526+08:00" level=info msg="RemovePodSandbox \"fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec\" returns successfully"
Sep 07 21:15:07 kind-worker2 containerd[1765]: time="2026-09-07T21:15:07.141776877+08:00" level=debug msg="schedule snapshotter cleanup" snapshotter=overlayfs
Sep 07 21:15:07 kind-worker2 containerd[1765]: time="2026-09-07T21:15:07.143009989+08:00" level=debug msg="removed snapshot" key=k8s.io/39/fe66a268b8d9be7d6521bce59ef0ede2d31f932ce470df5036fc77f97bbaf4ec snapshotter=overlayfs
```

调用栈：
``` go
instrumentedService.RemovePodSandbox()
    criService.RemovePodSandbox()
      criService.sandboxStore.Get(r.GetPodSandboxId())           // 获取sandbox配置信息
      criService.stopPodSandbox()                                // 如果仍有容器，那就stop， 如果网络空间还在，就释放掉
      criService.RemoveContainer()                               // 如果仍有容器，那就remove
      criService.sandboxService.ShutdownSandbox()
        Controller.Shutdown()
          ensureRemoveAll(ctx, sandboxRootDir)                   // umount所有已sandboxRootDir为前缀的目录，并删除sandboxRootDir
          ensureRemoveAll(ctx, volatileSandboxRootDir)           // umount所有已volatileSandboxRootDir为前缀的目录，并删除volatileSandboxRootDir
          sandbox.Container.Delete(ctx, containerd.WithSnapshotCleanup)   // 异步清理sandbox的容器可写层。 
```
