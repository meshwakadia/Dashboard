from odoo import http,api
from odoo.http import request
import base64
from datetime import datetime,date, timedelta, time


class WebsiteForm(http.Controller):    
    @http.route('/bdd-orders', auth="public", type="json", methods=['GET', 'POST'])
    def bdd_orders(self, **kw):
        data = kw
        
        # Check if 'StartDate' and 'EndDate' are present in the incoming data
        if 'StartDate' not in data or 'EndDate' not in data:
            return {'error': 'StartDate and EndDate are required'}

        input_format = '%Y-%m-%dT%H:%M'
        
        start_date = datetime.strptime(data['StartDate'], input_format)
        print('=====start_date=====',start_date)
        end_date = datetime.strptime(data['EndDate'], input_format)
        print('=====end_date=====',end_date)

        sale_ids = request.env['sale.order'].sudo().search([('date_order', '>=', start_date), ('date_order', '<=', end_date)])
        
        d1 = 0
        d2 = 0
        d3 = 0

        for rec in sale_ids:
            if rec.state == 'draft':
                d1 += 1
            elif rec.state == 'sent':
                d2 += 1
            elif rec.state == 'sale':
                d3 += 1

        data_update = {
            'my_quotations': d1,
            'my_opportunity': d2,
            'revenue': d3
        }

        return data_update
    
            
    @http.route('/bd-orders',auth="public", type="json", methods=['GET', 'POST'])
    def bd_orders(self,**kw):
        my_quotations = request.env['sale.order'].sudo().search_count([('state','=','draft')])
        my_opportunity = request.env['sale.order'].sudo().search_count([('state','=','sent')])
        revenue = request.env['sale.order'].sudo().search_count([('state','=','sale')])

        vals = {
                'my_quotations':my_quotations,
                'my_opportunity':my_opportunity,
                'revenue':revenue,
                }
        return vals
    
    @http.route('/top-products', auth="public", type="json", methods=['GET', 'POST'])
    def top_products(self, **kw):
        # Search for sale orders that are confirmed (state = 'sale')
        top = request.env['sale.order'].sudo().search([('state', '=', 'sale')])

        product_quantities = {}
        product_sale_order_ids = {}  # This will store the sale order IDs for each product

        for rec in top:
            order_id = rec.order_line
            for res in order_id:
                getproduct = res.product_template_id.name
                getquantity = res.product_uom_qty
                getproductid = res.product_template_id.id

                # Keep track of product quantities
                if getproduct in product_quantities:
                    product_quantities[getproduct] += getquantity
                else:
                    product_quantities[getproduct] = getquantity

                # Keep track of sale order IDs for each product (unique IDs only)
                if getproduct not in product_sale_order_ids:
                    product_sale_order_ids[getproduct] = set()  # Using set to avoid duplicates

                # Add the sale order ID for the product
                product_sale_order_ids[getproduct].add(rec.id)

        # Sort products by quantity sold
        top_product = sorted(product_quantities.items(), key=lambda x: x[1], reverse=True)
        top_5_product = top_product[:5]

        # Prepare response with product names, quantities, and sale order IDs
        keys = []
        values = []
        order_ids = []  # This will be a flat list of order IDs

        items = top_5_product
        for item in items:
            keys.append(item[0])
            values.append(item[1])
            # Flatten the order_ids and merge them into a single list
            order_ids.extend(product_sale_order_ids[item[0]])

        vals = {
            'keys': keys,
            'values': values,
            'order_ids': list(set(order_ids))  # Convert to set to avoid duplicates and then back to list
        }
        print("vals>>>>>>>>>>>>>",vals)
        return vals

