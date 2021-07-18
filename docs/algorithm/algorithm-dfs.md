---
title: "力扣: DFS相关题解"
date: 2021-04-04T20:50:43+08:00
draft: false
---

记录自己做过的的一些DFS的题解xxx

<!--more-->

78: 子集
``` golang
func subsets(nums []int) [][]int {
	res := [][]int{}
	dfs(nums, -1, []int{}, &res)
	return res
}

func dfs(nums []int, cur int, c []int, res *[][]int) {
	// fmt.Println(nums, cur, c, *res)
	*res = append(*res, c)

	for i := cur + 1; i < len(nums); i++ {
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, nums[i])
		dfs(nums, i, clone, res)
	}
	return
}
```

90: 子集II
``` golang
func subsetsWithDup(nums []int) [][]int {
	res := [][]int{}
	sort.Ints(nums)
	dfs(nums, -1, []int{}, &res)
	return res
}

func dfs(nums []int, cur int, c []int, res *[][]int) {
	// fmt.Println(nums, cur, c, *res)
	*res = append(*res, c)

	for i := cur + 1; i < len(nums); i++ {
		if i != cur+1 && nums[i] == nums[i-1] {
			continue
		}
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, nums[i])
		dfs(nums, i, clone, res)
	}
	return
}
```

491: 递增子序列
``` golang
func findSubsequences(nums []int) [][]int {
	res := [][]int{}
	dfs(nums, -1, []int{}, &res)
	return res
}

func dfs(nums []int, cur int, c []int, res *[][]int) {
	// fmt.Println(nums, cur, c, *res)
	if len(c) >= 2 {
		*res = append(*res, c)
	}

skip:
	for i := cur + 1; i < len(nums); i++ {
		for m := cur + 1; m < i; m++ {
			if nums[m] == nums[i] {
				continue skip
			}
		}
		if cur >= 0 && nums[cur] > nums[i] {
			continue
		}

		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, nums[i])
		dfs(nums, i, clone, res)
	}
	return
}
```

39: 组合总和
``` golang
func combinationSum(candidates []int, target int) [][]int {
	res := [][]int{}
	sort.Ints(candidates)
	dfs(candidates, target, -1, []int{}, &res)
	return res
}
func dfs(candidates []int, remain int, start int, c []int, res *[][]int) {
	if remain < 0 {
		return
	}
	if remain == 0 {
		*res = append(*res, c)
	}

	for i := start + 1; i < len(candidates); i++ {
		value := candidates[i]
		for m := 1; m*value <= remain; m++ {
			clone := make([]int, len(c), len(c)+m)
			copy(clone, c)
			for n := 1; n <= m; n++ {
				clone = append(clone, value)
			}
			dfs(candidates, remain-m*value, i, clone, res)
		}
	}
	return
}
```
40: 组合总和II
``` golang
func combinationSum2(candidates []int, target int) [][]int {
	res := [][]int{}
	sort.Ints(candidates)
	dfs(candidates, target, -1, []int{}, &res)
	return res
}
func dfs(candidates []int, remain int, start int, c []int, res *[][]int) {
	if remain < 0 {
		return
	}
	if remain == 0 {
		*res = append(*res, c)
	}

	for i := start + 1; i < len(candidates); i++ {
		value := candidates[i]
		if i != start+1 && candidates[i] == candidates[i-1] {
			continue
		}
		if value > remain {
			continue
		}
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, value)
		dfs(candidates, remain-value, i, clone, res)
	}
	return
}
```
216: 组合总和 III
``` golang
func combinationSum3(k int, n int) [][]int {
	res := [][]int{}
	dfs([]int{1, 2, 3, 4, 5, 6, 7, 8, 9}, k, n, -1, []int{}, &res)
	return res
}
func dfs(candidates []int, remainNums int, remainTarget int, start int, c []int, res *[][]int) {
	if remainNums == 0 && remainTarget == 0 {
		*res = append(*res, c)
		return
	}
	if remainNums <= 0 {
		return
	}

	for i := start + 1; i < len(candidates); i++ {
		value := candidates[i]

		if value > remainTarget {
			continue
		}
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, value)
		dfs(candidates, remainNums-1, remainTarget-value, i, clone, res)
	}
	return
}
```

46: 全排列
``` golang
func permute(nums []int) [][]int {
	res := [][]int{}
	visited := make([]bool, len(nums))
	dfs(nums, visited, len(nums), []int{}, &res)
	return res
}
func dfs(nums []int, visited []bool, remain int, c []int, res *[][]int) {
	if remain == 0 {
		*res = append(*res, c)
	}

	for i := 0; i < len(nums); i++ {
		if visited[i] == true {
			continue
		}
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, nums[i])
		visited[i] = true
		dfs(nums, visited, remain-1, clone, res)
		visited[i] = false
	}
	return
}
```

47: 全排列II
``` golang
func permuteUnique(nums []int) [][]int {
	res := [][]int{}
	sort.Ints(nums)
	visited := make([]bool, len(nums))
	dfs(nums, visited, len(nums), []int{}, &res)
	return res
}
func dfs(nums []int, visited []bool, remain int, c []int, res *[][]int) {
	// fmt.Println(nums, visited, remain, c, res)
	if remain == 0 {
		*res = append(*res, c)
	}
	for i := 0; i < len(nums); i++ {
		if visited[i] == true {
			continue
		}
		if i > 0 && visited[i-1] == false && nums[i] == nums[i-1] {
			continue
		}
		clone := make([]int, len(c), len(c)+1)
		copy(clone, c)
		clone = append(clone, nums[i])
		visited[i] = true
		dfs(nums, visited, remain-1, clone, res)
		visited[i] = false
	}
	return
}
```