// Norwegian Airlines prices, (c) Andrey Svetlichny, 2018
// Usage: run node Norwegian.js, then open outbound.csv and inbound.csv in Excel
const fs = require('fs'), https = require('https'), querystring = require('querystring');

const outboundDate = '2018-12-01';
const inboundDate = '2018-12-01';
const originAirportCode = 'SVG'; // Stavanger

getRelatedPrices(originAirportCode.toLowerCase(), data => {
	let outbound = fs.createWriteStream('outbound.csv');
	outbound.write('; ' + data.outbound.dates.map(o => o.substr(0, 10)).join('; '));
	for(let row of data.outbound.prices.sort(compareAirport)) {
		outbound.write('\n' + row.airport.airportName + '; ' + row.price.map(formatPrice).join('; '));
	}	
	let inbound = fs.createWriteStream('inbound.csv');
	inbound.write('; ' + data.inbound.dates.map(o => o.substr(0, 10)).join('; '));
	for(let row of data.inbound.prices.sort(compareAirport)) {
		inbound.write('\n' + row.airport.airportName + '; ' + row.price.map(formatPrice).join('; '));
	}	
});

function formatPrice(p) { if(p === 0) return ''; return p.toLocaleString('en-US').replace('.', ','); }

function compareAirport(a,b) {
  if (a.airport.airportName < b.airport.airportName) return -1;
  if (a.airport.airportName > b.airport.airportName) return 1;
  return 0;
}

function getRelatedPrices(airportCode, callback) {
	let result = {outbound: {dates: null, prices:[]}, inbound: {dates: null, prices:[]}};
	getRelatedAirpors(airportCode, airports => {
		let n = airports.length;
		for(let airport of airports) {
			getCalendar(airport.code, data => {	
				if(data.outbound && data.outbound.days.some(o => o.price !== 0)) {
					const days = data.outbound.days;
					if(!result.outbound.dates) {		
						result.outbound.dates = days.map(o => o.date);
					}
					result.outbound.prices.push({airport: airport, price: days.map(o => o.price)});
				}
				if(data.inbound && data.inbound.days.some(o => o.price !== 0)) {
					const days = data.inbound.days;
					if(!result.inbound.dates) {		
						result.inbound.dates = days.map(o => o.date);
					}
					result.inbound.prices.push({airport: airport, price: days.map(o => o.price)});
				}
				if(--n === 0) callback(result);
			});
		}	
	});
}
		
function getRelatedAirpors(airportCode, callback) {
	getDestinations(data => {
		const relations = data.relations[airportCode.toLowerCase()];
		const destinations = data.destinations.map(o => {return {airportName: o.airportName, code: o.code};});
		airports = relations.map(r => destinations.find(d => d.code === r)).filter(x => !!x);
		callback(airports);
	});
}	
		
function getCalendar(destinationAirportCode, callback) {	
    getPage("/api/fare-calendar/calendar?" + querystring.stringify({ 
			adultCount: 2,
			destinationAirportCode: destinationAirportCode, 
			includeTransit: true,
			originAirportCode: originAirportCode, 
			outboundDate: outboundDate,
			inboundDate: inboundDate,
			tripType: 2, // Round
			currencyCode: 'EUR',
			languageCode: 'en-GB'
		}), content => {
		const data = JSON.parse(content);
        callback(data);
    });
}

function getDestinations(callback) {
	const uri = "/api/destinations?channelId=IP&culture=en-GB&destinationModel=AirportModel&includeRelations=true&marketCode=uk&sortByCountryAndName=false&v=1fa3d084-92c7-4bbe-9317-7c65742a36d4";
	getPage(uri, content => {
		const data = JSON.parse(content);
		callback(data);
	});
}

function getPage(path, callback) {
	const host = "www.norwegian.com";
	const req = https.request({host: host, port: 443, path: path}, res => {
		let content = "";
		res.setEncoding("utf8");
		res.on("data", chunk => content += chunk);
		req.on('error', e => console.log(e));
		res.on("end", () => callback(content));
	});
	req.end();
}
