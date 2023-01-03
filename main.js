// get list of unique categories from redlistCategory attribute
let categories = data.map(obj => obj.redlistCategory);
categories = [... new Set(categories)]

// or if there is a manual order can do the following
const categoriesSorted = ["Critically Endangered", "Endangered", "Vulnerable", "Near Threatened", "Least Concern", "Data Deficient"];

const colorScale = d3.scaleOrdinal().domain(categoriesSorted).range(["#b30000", "#e34a33", "#fc8d59", "#fdbb84", "#fee8c8", "#d9d9d9"]);

// all variables related to dimensions

const length = 400;
const marginLength = 30;

const categoryHeight = 20;
const legendPadding = 50; //space between chart and legend
const legendHeight = categoryHeight * categoriesSorted.length;

const margin = {
    "top": marginLength,
    "left": marginLength,
    "bottom": marginLength,
    "right": marginLength
}

//prep data
const sumSortData = (data) => {
    //summarise data & calculate ratio & raw count for each category
    const rolledData = data.map((entry) =>
        d3.map(
            d3.rollup(data, v => v.length, d => d.redlistCategory),
            ([category, result]) => ({
                category: category,
                ratio: (result / data.length) * 100,
                quantity: result,
            })
        )
    )[0]

    // sort the data based on the order of categoriesSorted
    const order = {}; // map for efficient lookup of sortIndex
    for (let i = 0; i < categoriesSorted.length; i++) {
        order[categoriesSorted[i]] = i;
    }

    return rolledData.sort((a, b) => (order[a.category] - order[b.category]));
}

const createPieData = (data) => {
    const pie = d3.pie().value((d) => d.ratio);
    //pie(data) creates startAngle, endAngle for each data point

    const arcGenerator = d3
        .arc()
        .outerRadius(length / 2)
        .innerRadius(length / 3);

    return pie(data).map((d) => {
        return {
            data: d.data,
            path: arcGenerator.startAngle(d.startAngle).endAngle(d.endAngle)(),
            fill: colorScale(d.data.category),
            centroid: arcGenerator.centroid(d),
        };
    });

}

//final dataset
const dataSummed = sumSortData(data);
const pieData = createPieData(dataSummed);

//create SVG & G
const svg = d3.select("#chart").append("svg").attr("width", length + margin.left + margin.right).attr("height", length + margin.top + margin.bottom + legendHeight + legendPadding);

const chartG = svg.append("g").attr("class", "chartWrapper")
    .attr("transform", `translate(${margin.left + length / 2},${margin.top + length / 2})`)

const legendG = svg.append("g").attr("class", "legendWrapper")
    .attr("transform", `translate(${margin.left}, ${margin.top + legendPadding + length})`)

// add all units & text
chartG.selectAll(`path.slice`)
    .data(pieData)
    .join("path")
    .attr("class", `slice`)
    .attr("id", (d, i) => `slice_${i}`)
    .attr("d", d => d.path)
    .attr("stroke", "white")
    .attr("stroke-width", 1)
    .attr("fill", d => colorScale(d.fill))
    .each(function (d, i) {
        // This part from: https://www.visualcinnamon.com/2015/09/placing-text-on-arcs/

        //A regular expression that captures all in between the start of a string
        //(denoted by ^) and the first capital letter L
        const firstArcSection = /(^.+?)L/;

        //The [1] gives back the expression between the () (thus not the L as well)
        //which is exactly the arc statement
        let hiddenArc = firstArcSection.exec(d3.select(this).attr("d"))[1];
        //Replace all the comma's so that IE can handle it -_-
        //The g after the / is a modifier that "find all matches rather than
        //stopping after the first match"
        hiddenArc = hiddenArc.replace(/,/g, " ");

        //Create a new invisible arc that the text can flow along
        chartG.append("path")
            .attr("class", "hiddenArcs")
            .attr("id", `hiddenArc${i}`)
            .attr("d", hiddenArc)
            .style("fill", "none");
    });

chartG.selectAll(".donutText")
    .data(pieData)
    .join("text")
    .attr("class", "donutText")
    .attr("dy", -13)
    .append("textPath")
    .attr("startOffset", "50%")
    .style("text-anchor", "middle")
    .attr("xlink:href", (d, i) => `#hiddenArc${i}`)
    .text(d => `${Math.round(d.data.ratio * 10) / 10}%`);


// add legend    
const legend = legendG.selectAll("g.legendG")
    .data(dataSummed)
    .join("g")
    .attr("class", "legendG")
    .attr("transform", (d, i) => `translate(${margin.left},${i * categoryHeight})`);

legend.append("text").text(d => d.category)
    .attr("transform", "translate(15,9)"); //align texts with boxes

legend.append("rect")
    .attr("fill", d => colorScale(d.category))
    .attr("width", 10)
    .attr("height", 10);

