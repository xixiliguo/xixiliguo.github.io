---
title: "UnionFind并查集和相关题解"
author: "Peter Wang"
---

# 概述
并查集的go实现
``` go

type UnionFind struct {
	Parent []int
	Rank   []int
	Count  int
}

func NewUnionFind(n int) *UnionFind {
	un := &UnionFind{
		Parent: make([]int, n),
		Rank:   make([]int, n),
		Count:  n,
	}
	for i := 0; i < n; i++ {
		un.Parent[i] = i
		un.Rank[i] = 1
	}
	return un
}

func (un *UnionFind) Find(x int) int {
	for un.Parent[x] != x {
		x = un.Parent[x]
	}
	return x
}

func (un *UnionFind) Union(x, y int) {
	rootX := un.Find(x)
	rootY := un.Find(y)
	if rootX == rootY {
		return
	}
	if un.Rank[rootX] > un.Rank[rootY] {
		un.Parent[rootY] = rootX
	} else if un.Rank[rootX] < un.Rank[rootY] {
		un.Parent[rootX] = rootY
	} else {
		un.Parent[rootY] = rootX
		un.Rank[rootX]++
	}
	un.Count--
}

func (un *UnionFind) IsConnected(x, y int) bool {
	rootX := un.Find(x)
	rootY := un.Find(y)
	return rootX == rootY
}
```

# 1319. 连通网络的操作次数
```golang
func makeConnected(n int, connections [][]int) int {
	// len(connections)是现有的线缆数,如果小于机器数-1, 那么无论如何都是无法连接所有机器的
	if len(connections) < n-1 {
		return -1
	}
	un := NewUnionFind(n)
	for _, c := range connections {
		un.Union(c[0], c[1])
	}
	return un.Count - 1
}
```
# 547. 省份数量
```golang
func findCircleNum(isConnected [][]int) int {
	un := NewUnionFind(len(isConnected))
	for i := 0; i < len(isConnected); i++ {
		for j := 0; j < len(isConnected[i]); j++ {
			if isConnected[i][j] == 1 {
				un.Union(i, j)

			}
		}
	}
	return un.Count

}
```
# 990. 等式方程的可满足性
```golang
func equationsPossible(equations []string) bool {

	un := NewUnionFind(26)
	for _, e := range equations {
		if e[1:3] == "==" {
			un.Union(int(e[0]-'a'), int(e[3]-'a'))
		}
	}
	for _, e := range equations {
		if e[1:3] == "!=" {
			if un.IsConnected(int(e[0]-'a'), int(e[3]-'a')) {
				return false
			}
		}
	}
	return true
}
```

# 399. 除法求值
```golang
type NumUnionFind struct {
	Parent map[string]string
	Value  map[string]float64
	BigParent map[string]string
	BigValue  map[string]float64
}

func (un NumUnionFind) Union(x, y string, value float64) {
	_, xok := un.Parent[x]

	_, yok := un.Parent[y]
	if xok && !yok {
		un.Parent[y] = un.Find(x)
		un.Value[y] = 1 / value * un.Value[x]

	} else if !xok && yok {
		un.Parent[x] = un.Find(y)
		un.Value[x] = value * un.Value[y]
	} else if !xok && !yok {
		un.Parent[x] = y
		un.Value[x] = value
		un.Parent[y] = y
		un.Value[y] = 1
	} else {
		xp := un.Parent[x]
		yp := un.Parent[y]
		if xp != yp {
			un.Parent[xp] = yp
			un.Value[xp] = 1 / un.Value[x] * value * un.Value[y]
			for k, v := range un.Parent {
				if v == xp {
					un.Parent[k] = yp
					un.Value[k] = un.Value[k] * un.Value[xp]
				}
			}
		}
	}
}


func (un NumUnionFind) Isconnected(x, y string) bool {
	if _, ok := un.Parent[x]; !ok {
		return false
	}
	if _, ok := un.Parent[y]; !ok {
		return false
	}
	return un.Find(x) == un.Find(y)
}

func (un NumUnionFind) Find(x string) string {
	for un.Parent[x] != x {
		x = un.Parent[x]
	}
	return x
}

func calcEquation(equations [][]string, values []float64, queries [][]string) []float64 {

	un := NumUnionFind{
		make(map[string]string),
		make(map[string]float64),
	}
	for i, v := range equations {
		un.Union(v[0], v[1], values[i])
	}
	res := make([]float64, 0)
	for _, v := range queries {
		if un.Isconnected(v[0], v[1]) {
			res = append(res, un.Value[v[0]]*1/un.Value[v[1]])
		} else {
			res = append(res, -1.0)
		}
	}
	return res

}
```

# 684. 冗余连接
```golang
func findRedundantConnection(edges [][]int) []int {
	un := NewUnionFind(len(edges))
	preCount := len(edges)
	for i, edge := range edges {
		un.Union(edge[0]-1, edge[1]-1)
		if un.Count == preCount {
			return edges[i]
		}
		preCount = un.Count
	}
	return []int{}
}
```

# 参考
https://segmentfault.com/a/1190000022952886