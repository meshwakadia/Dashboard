{
    'name': 'Bd Dashboard',
    'version': '17.0',
    'sequence': '1',
    'depends': ['base','sale_management'],
    'demo': [],
    'data': [
        'security/ir.model.access.csv',
        'views/bd_dashboard_test.xml',
    ],      
    'assets': {
        'web.assets_backend': [
            'bd_dashboard/static/src/**/*.js',
            'bd_dashboard/static/src/**/*.xml',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
}