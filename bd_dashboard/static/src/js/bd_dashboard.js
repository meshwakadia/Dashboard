/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, useState, onMounted } from "@odoo/owl";
import { jsonrpc } from "@web/core/network/rpc_service";
import { ChartRenderer } from "../components/chart_render";
import { getColor } from "@web/views/calendar/colors";

const actionRegistry = registry.category("actions");

class BdDashboardTag extends Component {
    setup() {
        this.state = useState({
            quotations: {
                value: 10,
                percentage: 6,
            },
            period: 90,
        })
        super.setup();
        this.action = useService("action");
        this.orm = useService("orm");
        this.actionService = useService("action");

        const old_chartjs = document.querySelector('script[src="/web/static/lib/Chart/Chart.js"]');
        const router = useService("router");

        if (old_chartjs) {
            let { search, hash } = router.current;
            search.old_chartjs = old_chartjs != null ? "0" : "1";
            hash.action = 86;
            browser.location.href = browser.location.origin + routeToUrl(router.current);
        }

        onWillStart(async () => {
            await this.getTopProducts();
            await this.getTopSalesPeople();
            await this.getMonthlySales();
            await this.getPartnerOrders();

        });

        this.state = {
            myquotations: 0,
            myopportunity: 0,
            revenue: 0,
            order: 0,
            startDate: "",
            endDate: "",
            
        };
        this.fetch_Data();
        this.top_products();
        this.getOrder();
        this._fetchCountries();

    }

    async getTopProducts() {
        let domain = [['state', '=', 'sale']];

        if (this.state.period > 0) {
            domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
        }

        const promS = await jsonrpc('/top-products');
        const keys = promS.keys;
        const values = promS.values;

        this.state.topProducts = {
            data: {
                labels: keys,
                datasets: [
                    {
                        label: 'Count',
                        data: values,
                        backgroundColor: this.backgroundColor,
                    }
                ]
            },
            domain,
            label_field: 'order_line.product_template_id',
        };
    }


    async getTopSalesPeople() {
        let domain = [['state', '=', ['sale']]];
        if (this.state.period > 0) {
            domain.push(['date_order', '>', this.state.current_date]);
        }

        const data = await this.orm.readGroup("sale.order", domain, ['partner_id', 'amount_total'], ['partner_id'], { limit: 5, orderby: "amount_total desc" });

        this.state.topSalesPeople = {
            data: {
                labels: data.map(d => d.partner_id[1]),
                datasets: [
                    {
                        label: 'Total',
                        data: data.map(d => d.amount_total),
                        backgroundColor: this.backgroundColor,
                    }]
            },
            domain,
            label_field: 'partner_id',
        }
    }


    async getMonthlySales(){
        let domain = [['state', 'in', ['draft','sent','sale', 'done']]];
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date]);
        }

        const data = await this.orm.readGroup("sale.report", domain, ['date', 'state', 'price_total'], ['date', 'state'], { orderby: "date", lazy: false });
        console.log("monthlysales============", data);
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June', 
            'July', 'August', 'September', 'October', 'November', 'December'
        ];

    
        const labels = months;
        const quotations = data.filter(d => d.state == 'draft');
        console.log("quotations", quotations);
        const orders = data.filter(d => ['sale'].includes(d.state));
        const orders_amount = orders.map(order => order.amount_total);
        console.log("orders", orders_amount);


        const getMonthlyTotal = (month, data) => {
            const monthNumber = months.indexOf(month) + 1;
            return data.filter(d => new Date(d.date).getMonth() + 1 === monthNumber)
                    .map(d => d.price_total)
                    .reduce((a, c) => a + c, 0);
        };

        this.state.monthlySales = {
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Quotations',
                        data: labels.map(month => getMonthlyTotal(month, quotations)),
                        hoverOffset: 4,
                        backgroundColor: "red",
                    },
                    {
                        label: 'Orders',
                        data: labels.map(month => getMonthlyTotal(month, orders)),
                        hoverOffset: 4,
                        backgroundColor: "green",
                    }
                ]
            },
            domain,
            label_field: 'date',
        };
    }

    async getPartnerOrders(){
        let domain = [['state', 'in', ['draft','sent','sale', 'done']]]
        if (this.state.period > 0){
            domain.push(['date','>', this.state.current_date])
        }

        const data = await this.orm.readGroup("sale.report", domain, ['product_id', 'price_total'], ['product_id'], { orderby: "product_id", lazy: false })
        console.log("monthly sales=======", data)


        this.state.partnerOrders = {
            data: {
                labels: data.map(d => d.product_id[1]),
                datasets: [
                {
                    label: 'Total Amount',
                    data: data.map(d => d.price_total),
                    hoverOffset: 4,
                    backgroundColor: "orange",
                    yAxisID: 'Total',
                    order: 1,
                }]
            },
            scales: {
                /*Qty: {
                    position: 'right',
                }*/
                yAxes: [
                    { id: 'Qty', position: 'right' },
                    { id: 'Total', position: 'left' },
                ]
            },
            domain,
            label_field: 'product_id',
        }
    }

    
    async onChangePeriod() {
        this.getDates();
        await this.getQuotations();
        await this.getOpportunity();
        await this.getRevenue();
        await this.getOrder();
    }
    
    _fetchCountries () {
        var self = this;
        var prom = jsonrpc('/get_countries')
        // self.countries = countries;
        // console.log("self.countries_________________________",self.countries)
        // self.renderElement();
        console.log("prom_________________________",prom)
        return prom
    }

    top_products(ev) {
        var self = this;
        var prom = jsonrpc('/top-products');
        return prom;
    }

    fetch_Data(ev) {
        var self = this;
        var prom = jsonrpc('/bd-orders');
        prom.then(function (result) {
            self.state.myquotations = result.my_quotations || 0;
            self.state.myopportunity = result.my_opportunity || 0;
            self.state.revenue = result.revenue || 0;
            self.render();
        });
        return prom;
    }

    fetchData(ev) {
        var self = this;
        const startDateElement = document.getElementById("StartDate");
        const endDateElement = document.getElementById("EndDate");
        const startDate = startDateElement ? startDateElement.value : "";
        const endDate = endDateElement ? endDateElement.value : "";

        if (startDate && endDate) {
            jsonrpc("/bdd-orders", { StartDate: startDate, EndDate: endDate }).then(function (data) {
                self.state.myquotations = data.my_quotations || 0;
                self.state.myopportunity = data.my_opportunity || 0;
                self.state.revenue = data.revenue || 0;
                self.render();
            });
        } else {
            console.error("StartDate or EndDate is missing.");
        }
    }

    getDates() {
        const currentDate = new Date();
        const previousDate = new Date();
        previousDate.setDate(currentDate.getDate() - (this.state.period * 2));
        this.state.current_date = currentDate.toISOString().split('T')[0];
        this.state.previous_date = previousDate.toISOString().split('T')[0];
    }

    async getQuotations() {
        let prev_domain = [['state', 'in', ['draft']]];
        if (this.state.period > 0) {
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
        }
        let prev_data = await this.orm.searchCount("sale.order", prev_domain);
        this.state.myquotations = prev_data.toFixed(2);

        this.render();
    }

    openmyQuotations() {
        const startDateElement = document.getElementById("StartDate");
        const endDateElement = document.getElementById("EndDate");

        const startDate = startDateElement ? startDateElement.value : "";
        const endDate = endDateElement ? endDateElement.value : "";

        const domain_update = [['state', '=', 'draft'], ['date_order', '>=', startDate], ['date_order', '<=', endDate]];
        const domain_default = [['state', '=', 'draft']];
        if (this.state.period > 0) {
            let prev_domain = [['state', 'in', ['draft']]];
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: prev_domain,
                target: "current",
            });
        } else {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: startDate ? domain_update : domain_default,
                target: "current",
            });
        }
    }

    async getOpportunity() {
        let prev_domain = [['state', 'in', ['sent']]];
        if (this.state.period > 0) {
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
        }
        let prev_data = await this.orm.searchCount("sale.order", prev_domain);
        this.state.myopportunity = prev_data;
        this.render();
    }

    openmyOpportunity() {
        const startDateElement = document.getElementById("StartDate");
        const endDateElement = document.getElementById("EndDate");

        const startDate = startDateElement ? startDateElement.value : "";
        const endDate = endDateElement ? endDateElement.value : "";

        const domain_update = [['state', '=', 'sent'], ['date_order', '>=', startDate], ['date_order', '<=', endDate]];
        const domain_default = [['state', '=', 'sent']];
        if (this.state.period > 0) {
            let prev_domain = [['state', 'in', ['sent']]];
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: prev_domain,
                target: "current",
            });
        } else {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: startDate ? domain_update : domain_default,
                target: "current",
            });
        }
    }

    async getRevenue() {
        let prev_domain = [['state', 'in', ['sale']]];
        if (this.state.period > 0) {
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
        }
        let prev_data = await this.orm.searchCount("sale.order", prev_domain);
        this.state.revenue = prev_data.toFixed(2);
        this.render();
    }

    openrevenue() {
        const startDateElement = document.getElementById("StartDate");
        const endDateElement = document.getElementById("EndDate");

        const startDate = startDateElement ? startDateElement.value : "";
        const endDate = endDateElement ? endDateElement.value : "";

        const domain_update = [['state', '=', 'sale'], ['date_order', '>=', startDate], ['date_order', '<=', endDate]];
        const domain_default = [['state', '=', 'sale']];
        if (this.state.period > 0) {
            let prev_domain = [['state', 'in', ['sale']]];
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: prev_domain,
                target: "current",
            });
        } else {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: startDate ? domain_update : domain_default,
                target: "current",
            });
        }
    }

    async getOrder() {
        this.state.order = 0
        let prev_domain = [['state', 'in', ['sale']]];
        if (this.state.period > 0) {
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
        }

        let sale_orders = await this.orm.search("sale.order", prev_domain);
        let prev_data = await this.orm.read("sale.order", sale_orders, ['amount_total']);
        prev_data.forEach(orders => {
            this.state.order += orders.amount_total;
        });

        this.render();
    }

    openorder() {
        const startDateElement = document.getElementById("StartDate");
        const endDateElement = document.getElementById("EndDate");

        const startDate = startDateElement ? startDateElement.value : "";
        const endDate = endDateElement ? endDateElement.value : "";

        const domain_update = [['state', '=', 'sale'], ['date_order', '>=', startDate], ['date_order', '<=', endDate]];
        const domain_default = [['state', '=', 'sale']];
        if (this.state.period > 0) {
            let prev_domain = [['state', 'in', ['sale']]];
            prev_domain.push(['date_order', '>', this.state.previous_date], ['date_order', '<=', this.state.current_date]);
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: prev_domain,
                target: "current",
            });

        } else {
            this.action.doAction({
                type: "ir.actions.act_window",
                res_model: "sale.order",
                view_mode: "tree,form",
                views: [[false, "list"], [false, "form"]],
                domain: startDate ? domain_update : domain_default,
                target: "current",
            });
        }

    }
}

BdDashboardTag.template = "bd_dashboard.BdDashboard";
BdDashboardTag.components = { ChartRenderer };
actionRegistry.add("bd_dashboard_tag", BdDashboardTag);
registry.category("actions").add("owl.bd_dashboard", BdDashboardTag);
