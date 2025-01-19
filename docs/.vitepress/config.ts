export default {
  lang: 'en-US',
  title: 'xixiliguo',
  description: '博客',
  lastUpdated: true,
  themeConfig: {
    logo: '/img/coast.jpg',
    nav: [
      { text: 'Linux运维', link: '/linux/linux-common-commands' },
      { text: '网络协议', link: '/network/tcp' },
      { text: 'Golang笔记', link: '/golang/golang-exec' },
      { text: '容器与k8s', link: '/k8s/runc' },
      { text: '算法笔记', link: '/algorithm/radix-tree' },
      { text: '内核分析', link: '/kernel/kernel-syscall-sched' },
      { text: '杂项', link: '/others/code_segment' }
    ],


    sidebar: {
      '/linux/': [
        {
          text: 'Linux运维',
          collapsed: false,
          items: [
            { text: 'ATOP工作原理总结', link: '/linux/atop' },
            { text: '使用Bandersnatch搭建私有Pypi源', link: '/linux/bandersnatch-pypi' },
            { text: 'cloud-init学习笔记', link: '/linux/cloud-init' },
            { text: 'DNS学习总结', link: '/linux/dns' },
            { text: 'Linux Boot过程总结', link: '/linux/linux-boot' },
            { text: 'Linux 下常用命令与技巧汇总', link: '/linux/linux-common-commands' },
            { text: 'Linux /etc/shadow 文件学习笔记', link: '/linux/linux-shadow' },
            { text: 'Linux 网卡多队列介绍', link: '/linux/multi-queue' },
            { text: '理解NTP协议', link: '/linux/ntp' },
            { text: '使用Yum 升级OS', link: '/linux/yum-update' }
          ]
        }
      ],
      '/network/': [
        {
          text: '网络协议',
          collapsed: false,
          items: [
            { text: 'Libvirt Network 笔记', link: '/network/libvirt-network' },
            { text: 'TCP协议栈笔记', link: '/network/tcp' },
            { text: 'Tcpdump与Wireshark点滴记录', link: '/network/tcpdump-wireshark' },
            { text: 'ss命令指南', link: '/network/ss' }
          ]
        }
      ],
      '/golang/': [
        {
          text: 'Golang笔记',
          items: [
            { text: 'Golang os/exec 实现', link: '/golang/golang-exec' },
            { text: '从Go标准库看字符串匹配算法', link: '/golang/strings-algorithm-golang' }
          ]
        }
      ],
      '/k8s/': [
        {
          text: '容器与k8s',
          items: [
            { text: 'runc 容器运行时学习笔记', link: '/k8s/runc' }
          ]
        }
      ],
      '/algorithm/': [
        {
          text: '算法笔记',
          items: [
            { text: '力扣: DFS相关题解', link: '/algorithm/algorithm-dfs' },
            { text: '树状数组和相关题解', link: '/algorithm/binary-index-tree' },
            { text: 'Radix Tree介绍与httprouter源码笔记', link: '/algorithm/radix-tree' },
            { text: '线段树相关题解', link: '/algorithm/segment-tree' },
            { text: 'UnionFind并查集和相关题解', link: '/algorithm/unionfind' },
          ]
        }
      ],
      '/kernel/': [
        {
          text: '内核分析',
          items: [
            { text: 'cgroup与命名空间', link: '/kernel/kernel-cgroup-namespace' },
            { text: 'crash分析', link: '/kernel/kernel-crash' },
            { text: '中断', link: '/kernel/kernel-irq' },
            { text: '内存管理', link: '/kernel/kernel-memory' },
            { text: '系统调用与进程调度', link: '/kernel/kernel-syscall-sched' },
            { text: 'Linux: Trap', link: '/kernel/linux-trap' },
            { text: 'virtio驱动', link: '/kernel/virtio' },
            { text: '函数调用规约', link: '/kernel/function-call-conventions' },
            { text: 'eBPF', link: '/kernel/ebpf' },
          ]
        }
      ],
      '/others/': [
        {
          text: '杂项',
          items: [
            { text: '一些代码片段', link: '/others/code_segment' },
            { text: 'Lua实现原理 - GC垃圾回收', link: '/others/lua-implemention-gc' },
            { text: 'Lua实现原理 - 类型与值', link: '/others/lua-implemention-type-value' }
          ]
        }
      ]
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-present xixiliguo'
    },
  }
}

