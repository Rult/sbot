let tagAliases = null
if (typeof window == 'undefined') {
	// server-side use
	tagAliases = require('./aliases.js')
} else {
	// frontend use
	tagAliases = aliases
}

function toCommonForm(str) {
	return str.toLowerCase().replace(/_/g, '')
}

function checkProp(prop, value) {
	return prop && toCommonForm(prop) == value
}

function checkTag(img, item) {
	let kw = item.keyword
	switch (item.prefix) {
		case '': // normal keyword
			if (img.tags.indexOf(item.tag) != -1) {
				return 1
			}
			if (img.date && img.date.startsWith(kw)) {
				return 1
			}
			if (toCommonForm(img.title).indexOf(kw) != -1) {
				return 1
			}
		break
		case 'by':
			if (checkProp(img.takenBy, kw) ||
				checkProp(img.createdBy, kw) ||
				checkProp(img.editedBy, kw)) {
				return 1
			}
		break
		case 'tag':
			if (img.tags.indexOf(kw) != -1) {
				return 1
			}
		break
		case 'title':
			if (toCommonForm(img.title).indexOf(kw) != -1) {
				return 1
			}
		break
		case 'date':
			if (img.date && img.date.startsWith(kw)) {
				return 1
			}
		break
		case 'datelen':
			let num = parseInt(kw)
			let datelen = img.date ? img.date.length : 0
			if (datelen === num) {
				return 1
			}
		break
	}
	return 0
}

function checkImage(img, qGroups) {
	if (!qGroups) {
		return true
	}
	
	groupIter:
	for (let group of qGroups) {
		for (let item of group) {
			if (checkTag(img, item) == item.need) {
				// matched something in this group
				continue groupIter
			}
		}
		
		// matched nothing in this group
		return false
	}
	
	// matched in every group
	return true
}

function sortImages(imgList, sortOrder) {
	if (!sortOrder) {
		return imgList
	}

	// object -> array
	let sortable = []
	for (let key in imgList) {
		sortable.push({h: key, o: imgList[key]})
	}
	let originalKeys = Object.keys(imgList)

	// sorting functions
	let date = x => x.o.date ? x.o.date : ''
	let strDiff = (a, b) => {
		if (a > b) return 1
		if (a < b) return -1
		return 0
	}
	let dateDiff = (a, b) => {
		let vdiff = strDiff(date(b), date(a))
		if (vdiff) return vdiff
		let odiff = originalKeys.indexOf(a) - originalKeys.indexOf(b)
		return odiff
	}

	// sorting modes
	switch (sortOrder) {
		case 'newest':
			sortable.sort((a, b) => dateDiff(a, b))
		break
		case 'oldest':
			sortable.sort((a, b) => {
				if (date(a) == '' && date(b) != '') return 1
				if (date(a) != '' && date(b) == '') return -1
				return -dateDiff(a, b)
			})
		break
		case 'reverse':
			sortable.reverse()
		break
	}

	// array -> object
	let sorted = {}
	for (let {h, o} of sortable) {
		sorted[h] = o
	}
	return sorted
}

function filterImages(imgList, qGroups, asBoolObject) {
	let passedIds = asBoolObject ? {} : []
	
	for (let key in imgList) {
		let img = imgList[key]
		
		let passed = checkImage(img, qGroups)
		
		if (asBoolObject) {
			passedIds[key] = passed
		} else {
			if (passed) {
				passedIds.push(key)
			}
		}
	}
	
	return passedIds
}

function parseTags(raw) {
	if (!raw) {
		return null
	}
	return raw
		.trim()
		.replace(/[,\s]*\|[,\s]*/g, '|')
		.split(/(?:,|\s)+/)
		.map((group) => group
			.split(/\|/)
			.filter((s) => s.length > 0)
			.map((keyword) => {
				let need = 1
				let prefix = '' // normal keyword
				
				// parsing exclusion operator
				if (keyword.startsWith('-')) {
					keyword = keyword.slice(1)
					need = 0
				}
				
				// parsing prefix
				let prefixPos = keyword.indexOf(':')
				if (prefixPos != -1) {
					prefix = keyword.slice(0, prefixPos).toLowerCase()
					keyword = keyword.slice(prefixPos + 1)
				}
				
				keyword = toCommonForm(keyword)
				
				// picking tag alias
				let tag = keyword
				if (prefix == '') {
					for (key in tagAliases) {
						if (tag.match(tagAliases[key])) {
							tag = key
							break
						}
					}
				}
				
				return {
					keyword,
					tag,
					need,
					prefix,
				}
			})
		)
}

// for server-side use
if (typeof window == 'undefined') {
	module.exports = {filterImages, parseTags, sortImages}
}