/** @odoo-module */

import { registry } from "@web/core/registry"
import { loadJS } from "@web/core/assets"
const { Component, onWillStart, useRef, onMounted, useEffect, onWillUnmount } = owl
import { useService } from "@web/core/utils/hooks"
import { jsonrpc } from "@web/core/network/rpc_service";


export class ChartRenderer extends Component {
    setup(){
        this.chartRef = useRef("chart")
        this.actionService = useService("action")

        onWillStart(async ()=>{
            await loadJS("https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js")
            // await loadJS("/web/static/lib/Chart/Chart.js")
        })

        useEffect(()=>{
            this.renderChart()
        }, ()=>[this.props.config])

        // onMounted(()=>this.renderChart())

        onWillUnmount(()=>{
            if (this.chart){
                this.chart.destroy()
            }
        })
    }

    async renderChart(){
        const old_chartjs = document.querySelector('script[src="/web/static/lib/Chart/Chart.js"]')

        if (old_chartjs){
            return
        }
        
        if (this.chart){
            this.chart.destroy()
        }
        // console.log(">>>>>>>>>>>>>>>>>>>11111111111111>>>>>>>>>>>>>>>>>>>>>>>>>",this.props.config)
        this.chart = new Chart(this.chartRef.el,
            {
                type: this.props.type,
                data: this.props.config ? this.props.config.data : '',
                options: {
                    onClick: (e)=>{


                const active = e.chart.getActiveElements()

                if (active.length > 0){
                    const label = e.chart.data.labels[active[0].index]
                    const dataset = e.chart.data.datasets[active[0].datasetIndex].label
                    
                    //const label = this.chart.data.labels[_index]
                    //const dataset = this.chart.data.datasets[_datasetIndex].label

                    const { label_field, domain } = this.props.config
                    let new_domain = domain ? domain : []
                    const proms = jsonrpc('/top-products')
                    // console.log(">>>>>>>>>>=proms===",proms)
                    
                    if (label_field){
                        new_domain.push([label_field, '=', label])
                        }
                    
                    if (dataset == 'Quotations'){
                        new_domain.push(['state', '=', 'sale'])
                    }

                    
                    this.actionService.doAction({
                        type: "ir.actions.act_window",
                        name: this.props.title,
                        // res_model: "sale.report",
                        res_model: "sale.order",
                        domain: new_domain,
                        views: [
                            [false, "list"],
                            [false, "form"],
                        ]
                    })
                }
            },
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                },
                title: {
                    display: true,
                    text: this.props.title,
                    position: 'bottom',
                }
            },
            // scales: 'scales' in this.props.config ? this.props.config.scales : {},
            },
           
        }
);
}
}

ChartRenderer.template = "owl.ChartRenderer"