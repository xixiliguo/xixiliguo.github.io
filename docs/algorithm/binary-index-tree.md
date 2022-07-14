---
title: 树状数组和相关题解"
author: "Peter Wang"
---

# 概述
并查集的go实现
``` go
type BinaryIndexedTree struct {
	tree     []int
	capacity int
}

func (bit *BinaryIndexedTree) Add(index int, val int) {
	for ; index <= bit.capacity; index += lowbit(index) {
		bit.tree[index] += val
	}
}

func (bit *BinaryIndexedTree) Query(index int) int {
	sum := 0
	for ; index > 0; index -= lowbit(index) {
		sum += bit.tree[index]
	}
	return sum
}

func (bit *BinaryIndexedTree) InitWithNums(nums []int) {
	bit.tree, bit.capacity = make([]int, len(nums)+1), len(nums)
	for i := 1; i <= len(nums); i++ {
		for j := i - 1; j >= i-lowbit(i); j-- {
			bit.tree[i] += nums[j]
		}
	}
}

func lowbit(x int) int {
	return x & -x
}
```

# 307. 区域和检索 - 数组可修改
```go
type NumArray struct {
    bit BinaryIndexedTree
    nums []int
}


func Constructor(nums []int) NumArray {
    n := NumArray{}
    n.bit.InitWithNums(nums)
    n.nums = nums
    return n
}


func (this *NumArray) Update(index int, val int)  {

    this.bit.Add(index + 1, val - this.nums[index] )
    this.nums[index] = val

}


func (this *NumArray) SumRange(left int, right int) int {
    return this.bit.Query(right+1) - this.bit.Query(left)
}
```


# 参考
https://segmentfault.com/a/1190000022952886