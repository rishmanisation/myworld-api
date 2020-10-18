from pymongo import MongoClient
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import adapt, register_adapter, AsIs
import csv
import pandas as pd
import numpy as np
from decimal import Decimal
import json


foreign_key_mappings = {
    'LAYOUT_ID': 'FOREIGN KEY (LAYOUT_ID) REFERENCES MD_LAYOUT_TEMPLATES(LAYOUT_ID)',
    'TEMPLATE_ID': 'FOREIGN KEY (TEMPLATE_ID) REFERENCES MD_TEMPLATES(TEMPLATE_ID)',
    'USERNAME': 'FOREIGN KEY (USERNAME) REFERENCES UD_P_USER_PROFILE(USERNAME)',
    'ITEM_ID': 'FOREIGN KEY (ITEM_ID) REFERENCES MD_ITEMS(ITEM_ID)',
    'HOME_ID': 'FOREIGN KEY (HOME_ID) REFERENCES UD_P_HOMES(HOME_ID)',
    'SUBSC_ID': 'FOREIGN KEY (SUBSC_ID) REFERENCES MD_SUBSCRIPTIONS(SUBSC_ID)',
    'PAYMENT_ID': 'FOREIGN KEY (PAYMENT_ID) REFERENCES MD_PAYMENTS(PAYMENT_ID)',
    'ISSUE_ID': 'FOREIGN KEY (ISSUE_ID) REFERENCES MD_ISSUES(ISSUE_ID)',
    'ROOM_ID': 'FOREIGN KEY (ROOM_ID) REFERENCES MD_ROOMS(ROOM_ID)'
}
#client = MongoClient('mongodb+srv://rish:rish@rishabhtest-qri9a.mongodb.net/test?retryWrites=true&w=majority')

class Point(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y

def adapt_point(point):
     x = adapt(point.x).getquoted().decode('utf-8')
     y = adapt(point.y).getquoted().decode('utf-8')
     return AsIs("'(%s, %s)'" % (x, y))

def create_commands(tables_file):
    commands = []
    cols = []
    col_types = []
    with open(tables_file, encoding='utf-8') as file:
        csvreader = csv.reader(file)
        for row in csvreader:
            #contents = row.split(',')
            statement = 'CREATE TABLE ' + row[0] + ' ('

            columns = row[1].split('|')
            key_types = row[2].split('|')
            field_types = row[3].split('|')
            foreign_keys = []
            colstr = ''
            for i in range(len(columns)):
                colstr = colstr + columns[i] + ' ' + field_types[i]
                if key_types[i] == 'P':
                    colstr = colstr + ' PRIMARY KEY'
                elif key_types[i] == 'F':
                    foreign_keys.append(foreign_key_mappings[columns[i]] + ' ON UPDATE CASCADE ON DELETE CASCADE')
                    '''
                    if columns[i] == 'PRODUCT_ID':
                        foreign_keys.append('FOREIGN KEY (PRODUCT_ID) REFERENCES PRODUCT_MD(PRODUCT_ID) ON UPDATE CASCADE ON DELETE CASCADE')
                    '''
                if i < len(columns) - 1:
                    colstr = colstr + ', '
            
            if len(foreign_keys) > 0:
                for foreign_key in foreign_keys:
                    colstr = colstr + ',' + foreign_key
            
            statement = statement + colstr + ')'
            commands.append(statement)
            cols.append(columns)
            col_types.append(field_types)
        
        return commands, cols, col_types

def insert_into(table_name, values_file, cur, cols, col_types):
    insert_query = 'INSERT INTO ' + table_name + '('
    '''
    if table_name == 'PRODUCT_MD':
        cols = ['PRODUCT_ID', 'MANUFACTURER', 'MODEL', 'CATEGORY', 'COLORS', 'URL', 'IMAGE', 'PRICE', 'MANUAL']
    elif table_name == 'REVIEWS_MD':
        cols = ['REVIEW_ID', 'PRODUCT_ID', 'DATE_PUBLISHED', 'DATE_MODIFIED', 'AUTHOR', 'CONTENT', 'RATING']
    '''
    insert_query = insert_query + ','.join(cols) + ') VALUES(' + ','.join(['%s' for i in range(len(cols))]) + ')'
    #print(insert_query)

    values = []
    with open(values_file, encoding='utf-8') as val_file:
        csvreader = csv.reader(val_file, delimiter=';')
        for row in csvreader:
            data = []
            for i in range(len(row)):
                if col_types[i] == 'POINT':
                    x_coord, y_coord = row[i].split(',')
                    x, y = float(x_coord[1:]), float(y_coord[:-1])
                    data.append(Point(x, y))
                elif 'INT' in col_types[i]:
                    if row[i] == 'NULL':
                        data.append(None)
                    else:
                        data.append(int(row[i]))
                elif '[]' in col_types[i]:
                    data.append('{' + row[i].replace('|',',') + '}')
                else:
                    data.append(row[i])
            values.append(tuple(data))
    cur.executemany(insert_query, values)

def populate_user_homes(cur, cols, col_types):
    username = 'rkhandewale'
    get_address = "select ADDRESS from UD_P_USER_PROFILE where USERNAME LIKE '%" + username + "%'"
    cur.execute(get_address)
    address = cur.fetchall()[0]['address']

    get_template_id = "select TEMPLATE_ID from MD_ADDRESS_TEMPLATES where ADDRESS LIKE '%" + address + "%'"
    cur.execute(get_template_id)
    template_id = cur.fetchall()[0]['template_id']

    get_template_details = "select * from MD_TEMPLATES where TEMPLATE_ID = " + str(template_id)
    cur.execute(get_template_details)
    template_details = cur.fetchall()
    template_type = template_details[0]['template_type']
    rooms = template_details[0]['room_ids']

    #print(address, template_id, template_type, rooms)
    #room_ids = [room[1:-1] for room in rooms]
    
    template_json = {
        'address': address,
        'template_id': template_id,
        'template_type': template_type[1:-1],
        'rooms': {}
    }

    get_room_information = "select * from MD_ROOMS where ROOM_ID in (''" + "'',''".join(rooms) + "'')"
    cur.execute(get_room_information)
    room_information = cur.fetchall()
    rooms = {}
    for room in room_information:
        temp = {}
        temp['room_type'] = room['room_type'][1:-1]
        temp['items'] = {}
        temp['subscriptions'] = {}
        temp['room_properties'] = {}
        for room_prop, room_prop_val in zip(room['room_properties'], room['room_property_values']):
            temp['room_properties'][room_prop[1:-1]] = room_prop_val[1:-1]
        rooms[room['room_id'][1:-1]] = temp
    
    template_json['rooms'] = rooms

    with open('template_data.json', 'w') as write_file:
        json.dump(template_json, write_file)
    
    insert_query = "insert into UD_P_USER_HOMES(USERNAME, TEMPLATE_ID, TEMPLATE) values('''" + username + "'''," + str(template_id) + ",'" + json.dumps(template_json) + "')"
    cur.execute(insert_query)

register_adapter(Point, adapt_point)

conn = psycopg2.connect(host="localhost",database="myworld", user="postgres", password="pwd")
cur = conn.cursor(cursor_factory=RealDictCursor)
commands, cols, col_types = create_commands('tables.csv')
print(commands)


for command in commands:
    cur.execute(command)

insert_into('MD_ADDRESS_TEMPLATES', 'md_addr_coord_sample.csv', cur, cols[0], col_types[0])
insert_into('MD_TEMPLATES', 'md_templates.csv', cur, cols[1], col_types[1])
insert_into('MD_ROOMS', 'md_rooms.csv', cur, cols[2], col_types[2])
insert_into('MD_ITEMS', 'md_items.csv', cur, cols[3], col_types[3])
insert_into('MD_SUBSCRIPTIONS', 'md_subscriptions.csv', cur, cols[4], col_types[4])
insert_into('MD_ITEMS_HIERARCHY', 'md_items_hierarchy.csv', cur, cols[5], col_types[5])
insert_into('MD_SUBSCRIPTIONS_HIERARCHY', 'md_subscriptions_hierarchy.csv', cur, cols[6], col_types[6])
insert_into('UD_P_USER_PROFILE', 'ud_user_profile.csv', cur, cols[7], col_types[7])

conn.commit()

populate_user_homes(cur, cols[8], col_types[8])

insert_into('UD_P_USER_ITEMS', 'ud_p_user_items.csv', cur, cols[9], col_types[9])
insert_into('UD_P_USER_SUBSCRIPTIONS', 'ud_p_user_subscriptions.csv', cur, cols[10], col_types[10])

'''
insert_into('MD_ITEMS', 'test_items_md.csv', cur, cols[0], col_types[0])
insert_into('MD_SUBSCRIPTIONS', 'test_subsc_md.csv', cur, cols[1], col_types[1])
insert_into('MD_PAYMENTS', 'test_payments_md.csv', cur, cols[2], col_types[2])
insert_into('MD_SERVICE_PROVIDER', 'test_service_provider_md.csv', cur, cols[3], col_types[3])
insert_into('MD_TEMPLATES', 'test_templates_md.csv', cur, cols[4], col_types[4])
insert_into('MD_ISSUES', 'test_md_issues.csv', cur, cols[7], col_types[7])
insert_into('UD_P_USER_PROFILE', 'test_user_profile_ud.csv', cur, cols[8], col_types[8])
insert_into('UD_P_HOMES', 'test_homes_ud.csv', cur, cols[9], col_types[9])
insert_into('UD_P_HOME_TEMPLATES', 'test_home_templates_ud.csv', cur, cols[10], col_types[10])
insert_into('UD_P_ITEMS', 'test_items_ud.csv', cur, cols[11], col_types[11])
insert_into('UD_P_SUBSCRIPTIONS', 'test_subscriptions_ud.csv', cur, cols[12], col_types[12])
insert_into('UD_P_PAYMENTS', 'test_payments_ud.csv', cur, cols[13], col_types[13])
#insert_into('UD_A_EVENTS', 'test_ud_events.csv', cur, cols[14], col_types[14])
#insert_into('UD_A_MESSAGES', 'test_ud_messages.csv', cur, cols[15], col_types[15])
insert_into('UD_A_TICKETS', 'test_ud_tickets.csv', cur, cols[16], col_types[16])
'''

cur.close()
conn.commit()

if conn is not None:
    conn.close()
'''
select_cols = []
for col in ['P.'+ c for c in cols[0]] + ['R.' + c for c in cols[1]]:
    if not '_ID' in col:
        select_cols.append(col)

select_query = 'SELECT ' + ','.join(select_cols) + ' FROM PRODUCT_MD P, REVIEWS_MD R WHERE P.PRODUCT_ID = R.PRODUCT_ID'

cur.execute(select_query)
print(cur.fetchall())


cur.close()
conn.commit()

if conn is not None:
    conn.close()
'''

