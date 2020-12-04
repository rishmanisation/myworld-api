import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import adapt, register_adapter, AsIs
import csv
import json
from airtable import Airtable


foreign_key_mappings = {
    'LAYOUT_ID': 'FOREIGN KEY (LAYOUT_ID) REFERENCES MD_LAYOUT_TEMPLATES(LAYOUT_ID)',
    'TEMPLATE_ID': 'FOREIGN KEY (TEMPLATE_ID) REFERENCES MD_TEMPLATES(TEMPLATE_ID)',
    'USERNAME': 'FOREIGN KEY (USERNAME) REFERENCES UD_P_USER_PROFILE(USERNAME)',
    'ITEM_ID': 'FOREIGN KEY (ITEM_ID) REFERENCES MD_ITEMS(ITEM_ID)',
    'HOME_ID': 'FOREIGN KEY (HOME_ID) REFERENCES UD_P_HOMES(HOME_ID)',
    'SUBSC_ID': 'FOREIGN KEY (SUBSC_ID) REFERENCES MD_SUBSCRIPTIONS(SUBSC_ID)',
    'PAYMENT_ID': 'FOREIGN KEY (PAYMENT_ID) REFERENCES MD_PAYMENTS(PAYMENT_ID)',
    'ISSUE_ID': 'FOREIGN KEY (ISSUE_ID) REFERENCES MD_ISSUES(ISSUE_ID)',
    'ROOM_ID': 'FOREIGN KEY (ROOM_ID) REFERENCES MD_ROOMS(ROOM_ID)',
    'WARRANTY_ID': 'FOREIGN KEY (WARRANTY_ID) REFERENCES MD_SUBSCRIPTIONS(SUBSC_ID)'
}
class Point(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y

def adapt_point(point):
     x = adapt(point.x).getquoted().decode('utf-8')
     y = adapt(point.y).getquoted().decode('utf-8')
     return AsIs("'(%s, %s)'" % (x, y))

def create_commands(base_key, api_key):
    create_commands = []
    airtable_md = Airtable(base_key, 'Master Data', api_key)
    airtable_ud_p = Airtable(base_key, 'User Data Profile', api_key)
    tables = airtable_md.get_all(sort='Order') + airtable_ud_p.get_all(sort='Order')
    
    table_names = []
    for table in tables:
        table_names.append(table['fields']['Name'])
    
    for table in table_names:
        create_command = 'CREATE TABLE ' + table + '('
        airtable = Airtable(base_key, table, api_key)
        cols = airtable.get_all(sort='Order')
        col_names = [ col['fields']['Column'] for col in cols ]
        col_types = [ col['fields']['Data Type'] for col in cols ]
        key_types = [ col['fields']['Key Type'] for col in cols ]
        fkmapping = ''

        for col_name, col_type, key_type in zip(col_names, col_types, key_types):
            create_command = create_command + col_name + ' ' + col_type
            if key_type == 'P':
                create_command = create_command + ' PRIMARY KEY'
            elif key_type == 'F':
                fkmapping = ' ' + foreign_key_mappings[col_name] + ' ON UPDATE CASCADE ON DELETE CASCADE,'
            create_command = create_command + ','
        
        create_command = create_command + fkmapping
        create_command = create_command[:-1] + ')'
        create_commands.append(create_command)
    
    return create_commands

def insert_into(cur, base_key, api_key):
    insert_queries = []
    table_values = []
    airtable_md = Airtable(base_key, 'Master Data', api_key)
    airtable_ud_p = Airtable(base_key, 'User Data Profile', api_key)
    tables = airtable_md.get_all(sort='Order') + airtable_ud_p.get_all(sort='Order')
    
    table_names = []
    for table in tables:
        table_names.append(table['fields']['Name'])
    
    for table in table_names:
        airtable = Airtable(base_key, table, api_key)
        cols = airtable.get_all(sort='Order')
        col_names = [ col['fields']['Column'] for col in cols ]
        col_types = [ col['fields']['Data Type'] for col in cols ]

        insert_query = 'INSERT INTO ' + table + '(' + ','.join(col_names) + ') ' + 'VALUES(' + ','.join(['%s' for i in range(len(col_names))]) + ')'

        values = []
        with open(table + '.csv', encoding='utf-8') as val_file:
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
                    elif 'DECIMAL' in col_types[i]:
                        if row[i] == 'NULL':
                            data.append(None)
                        else:
                            data.append(float(row[i]))
                    elif '[]' in col_types[i]:
                        data.append('{' + row[i].replace('|',',') + '}')
                    else:
                        data.append(row[i])
                values.append(tuple(data))
            
            insert_queries.append(insert_query)
            table_values.append(values)
        
        for table in table_names:
            if table == 'UD_P_USER_HOMES':
                populate_user_homes(cur)
        
        cur.executemany(insert_queries, table_values)

def populate_user_homes(cur):
    username = 'rkhandewale'
    get_address = "select ADDRESS from UD_P_USER_PROFILE where USER_ID LIKE '%" + username + "%'"
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
commands = create_commands('app4vLfX6gaw1Ks2q', 'keyho1LXH3GM7gWJx')

for command in commands:
    print(command)
    cur.execute(command)

conn.commit()

'''
insert_into('MD_ADDRESS_TEMPLATES', 'md_addr_coord_sample.csv', cur, cols[0], col_types[0])
insert_into('MD_TEMPLATES', 'md_templates.csv', cur, cols[1], col_types[1])
insert_into('MD_ROOMS', 'md_rooms.csv', cur, cols[2], col_types[2])
insert_into('MD_ITEMS', 'md_items.csv', cur, cols[3], col_types[3])
insert_into('MD_SUBSCRIPTIONS', 'md_subscriptions.csv', cur, cols[4], col_types[4])
insert_into('MD_ITEMS_HIERARCHY', 'md_items_hierarchy.csv', cur, cols[5], col_types[5])
insert_into('MD_SUBSCRIPTIONS_HIERARCHY', 'md_subscriptions_hierarchy.csv', cur, cols[6], col_types[6])
insert_into('UD_P_USER_PROFILE', 'ud_user_profile.csv', cur, cols[7], col_types[7])
'''

insert_into(cur, 'app4vLfX6gaw1Ks2q', 'keyho1LXH3GM7gWJx')
conn.commit()

'''
populate_user_homes(cur, cols[8], col_types[8])

insert_into('UD_P_USER_ITEMS', 'ud_p_user_items.csv', cur, cols[9], col_types[9])
insert_into('UD_P_USER_SUBSCRIPTIONS', 'ud_p_user_subscriptions.csv', cur, cols[10], col_types[10])
'''