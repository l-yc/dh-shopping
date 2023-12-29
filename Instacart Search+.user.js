// ==UserScript==
// @name     Instacart Search+
// @author	 cyclic
// @match		 https://www.instacart.com/store/*/s?k=*
// @version  1
// @grant    none
// ==/UserScript==

function parseAmountString(amount) {
	// Extract weight from the "About x.x lb / package" string
	const matchAmount = amount.match(/([0-9.]+)\s*([a-zA-Z]+)(?:\s*\(([\w\s]+)\))?/);
	const quantity = matchAmount ? parseFloat(matchAmount[1]) : 1; // Default to 1 if quantity is not available
	let unit = matchAmount ? matchAmount[2].toLowerCase() : ""; // Default to an empty string if unit is not available

	// Convert units to pounds (if needed)
	let convertedAmount = quantity;
	if (unit === "oz") {
		convertedAmount = quantity / 16; // 1 pound = 16 ounces
		unit = 'lb';
	} else if (unit === "lb") {
		convertedAmount = quantity;
	} else {
		convertedAmount = quantity;
		console.log('unknown amount unit: ' + unit);
	}

	return {
		quantity: convertedAmount,
		unit: unit,
	}
}

function parsePriceString(priceByWeight) {
	// Extract price from the "$x.xx / lb" string
	const matchPrice = priceByWeight.match(/([0-9.]+)\s*\/\s*([a-zA-Z]+)/);
	const pricePerUnit = matchPrice ? parseFloat(matchPrice[1]) : 0; // Default to 0 if price is not available
	const priceUnit = matchPrice ? matchPrice[2].toLowerCase() : ""; // Default to an empty string if unit is not available
	let convertedPrice = pricePerUnit;
	if (priceUnit === "oz") {
		convertedPrice = pricePerUnit * 16; // 1 pound = 16 ounces
		priceUnit = 'lb';
	} else if (priceUnit === "lb") {
		convertedAmount = pricePerUnit;
	} else {
		convertedAmount = pricePerUnit;
		console.log('unknown price unit: ' + priceUnit);
	}

	return {
		quantity: convertedPrice,
		unit: priceUnit,
	}
}


function scrapeResults() {
	// Extract information from each outer container
	const outerContainers = document.querySelectorAll('.e-wqerce');
	const allItems = [];
	console.log(outerContainers);

	outerContainers.forEach((outerContainer) => {
		const listItems = outerContainer.querySelectorAll('.e-w6zd6i li');

		listItems.forEach((listItem) => {
			const parent = listItem.querySelector('.e-owi8n8').parentElement;

			const special = listItem.querySelector('.e-wiwapk');
			if (special === null) {
				// price given by per package, weight is given 
				const description = listItem.querySelector('.e-owi8n8 .e-u2e78b').textContent.trim();
				const _amount = listItem.querySelector('.e-zjik7 .e-owckh2').getAttribute('title');
				const _price = listItem.querySelector('.e-1jioxed .e-z9kc8d .e-p745l:nth-child(1)').textContent + listItem.querySelector('.e-1jioxed .e-z9kc8d .e-1qkvt8e').textContent + '.' +
					listItem.querySelector('.e-1jioxed .e-z9kc8d .e-p745l:nth-child(3)').textContent;

				// AMOUNT
				// parse amount string of the form "x.x oz"
				const matchAmount = _amount.match(/([0-9.]+)\s*([a-zA-Z]+)/);
				const quantity = matchAmount ? parseFloat(matchAmount[1]) : 1; // Default to 1 if quantity is not available
				let unit = matchAmount ? matchAmount[2].toLowerCase() : ""; // Default to an empty string if unit is not available

				// Convert units to pounds (if needed)
				let convertedAmount = quantity;
				if (unit === "oz") {
					convertedAmount = quantity / 16; // 1 pound = 16 ounces
					unit = 'lb';
				} else if (unit === "lb") {
					convertedAmount = quantity;
				} else {
					convertedAmount = quantity;
					console.log('unknown amount unit: ' + unit);
				}

				// PRICE
				// parse price string of the form "$x.xx"
				const matchPrice = _price.match(/([0-9.]+)/);
				const price = matchPrice ? parseFloat(matchPrice[1]) : 0; // Default to 0 if price is not available

				const convertedPrice = price / convertedAmount; // Calculate price per unit

				// Store the extracted information for each list item within each outer container
				allItems.push({
					_element: listItem,
					_amount,
					_price,

					description,
					amount: {
						quantity: convertedAmount,
						unit,
					},
					price: {
						quantity: convertedPrice,
						unit,
					},
					packagePrice: price,
				});
			} else {
				// price given by by weight
				const description = listItem.querySelector('.e-owi8n8 .e-u2e78b').textContent.trim();
				const priceByWeight = listItem.querySelector('.e-zjik7 .e-owckh2').getAttribute('title');
				const _price = listItem.querySelector('.e-k008qs').textContent.trim();
				const _amount = listItem.querySelector('.e-wiwapk').textContent.trim();

				// AMOUNT
				const amount = parseAmountString(_amount);

				// PRICE
				const price = parsePriceString(priceByWeight);

				const packagePrice = price.quantity * amount.quantity; // Calculate total price

				// Store the extracted information for each list item within each outer container
				allItems.push({
					_element: listItem,
					_amount,
					_price,
					_priceByWeight: priceByWeight,

					description,
					amount,
					price,
					packagePrice: packagePrice,
				});
			}
		});
	});

	allItems.forEach((item) => {
		let txt = '';
		txt += 'Unit Price: $' + item.price.quantity.toFixed(2) + ' / ' + item.price.unit;
		item._element.querySelector('.e-1om9ohm').textContent = txt;
	});
	return [allItems, outerContainers];
}

function sortResults() {
	let [allItems, outerContainers] = scrapeResults();

	console.log(allItems);
	allItems.sort((a, b) => a.price.quantity - b.price.quantity);
	console.log(allItems);

	allItems.forEach((item) => item._element.remove());
	allItems.forEach((item) => outerContainers[0].querySelector('.e-w6zd6i').appendChild(item._element));
}

function filterResults() {
	let [allItems, outerContainers] = scrapeResults();

	const title = document.querySelector('.e-1ykpxno');
	// match the string in quotes in title
	const matchTitle = title.innerText.match(/"([^"]+)"/);
	const filter = matchTitle ? matchTitle[1] : ""; // Default to an empty string if filter is not available

	if (title.getAttribute('hard-filter') === null) {
		title.setAttribute('hard-filter', 'true');
		// if hard filter is not set, then filter out items that do not contain the filter
		allItems.forEach((item) => {
			// if-else to ignore case when checking if description contains filter
			if (!item.description.toLowerCase().includes(filter.toLowerCase())) {
				item._element.style.display = 'none';
			}
		});
	} else {
		title.removeAttribute('hard-filter');
		allItems.forEach((item) => {
			// if-else to ignore case when checking if description contains filter
			if (!item.description.toLowerCase().includes(filter.toLowerCase())) {
				item._element.style.display = 'block';
			}
		});
	}
}

function addButtons() {
	function makeSortButton() {
		let div = document.createElement('div');
		div.innerHTML = '<button id="sort">Sort</button>';
		div.onclick = () => sortResults();
		return div;
	}

	function makeFilterButton() {
		let div = document.createElement('div');
		div.innerHTML = '<button id="filter">Filter</button>';
		div.onclick = () => filterResults();
		return div;
	}

	let div = document.createElement('div');
	div.style.position = 'fixed';
	div.style.top = '0';
	div.style.left = '0';
	div.style.zIndex = '9999';
	div.style.backgroundColor = 'white';
	div.style.padding = '10px';
	div.style.border = '1px solid black';
	div.style.borderRadius = '5px';

	div.appendChild(makeSortButton());
	div.appendChild(makeFilterButton());
	document.body.appendChild(div);
}

(() => {
  addButtons();
  
})();