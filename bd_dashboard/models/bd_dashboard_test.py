from odoo import api, fields, models, _
from datetime import date, datetime
from odoo.exceptions import UserError

class BdLead(models.Model):
    """bd inherited model"""
    _name = 'bd.dashboard'   
    _description = 'Bd Dashboard'
        
    @api.model
    def get_tiles_data(self):
        """ Return the tile data"""
        draft = self.env['sale.order'].search([('state', '=', 'draft')])
        state = self.env['sale.order'].search([('state', '=', 'sent')])
        sale = self.env['sale.order'].search([('state', '=', 'sale')])
        currency = state.currency_id.symbol
        
        return {
            'total_quotations': len(draft),
            'total_opportunity': len(state),
            'expected_revenue': len(sale),
            'currency': currency,
        }