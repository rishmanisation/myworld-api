import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.extensions import adapt, register_adapter, AsIs
import json

from airtable import Airtable

# Point class
'''
This class is used to model the lat-long for all coordinate fields in the database.
'''
class Point(object):
    def __init__(self, x, y):
        self.x = x
        self.y = y


def adapt_point(point):
    x = adapt(point.x).getquoted().decode('utf-8')
    y = adapt(point.y).getquoted().decode('utf-8')
    return AsIs("'(%s, %s)'" % (x, y))


'''
Function to generate the create commands for our database.
'''
def create_commands(base_key, api_key):
    create_commands = []
    airtable_md = Airtable(base_key, 'Master Data Tables', api_key)
    airtable_ud_p = Airtable(base_key, 'User Data Profile Tables', api_key)
    tables = airtable_md.get_all(sort='Order') + \
        airtable_ud_p.get_all(sort='Order')

    fk_json = open('foreign_key_mappings.json',)
    foreign_key_mappings = json.load(fk_json)

    table_names = []
    for table in tables:
        table_names.append(table['fields']['Name'])

    for table in table_names:
        create_command = 'CREATE TABLE IF NOT EXISTS ' + table + '('
        airtable = Airtable(base_key, table, api_key)
        cols = airtable.get_all(sort='Order')
        col_names = [col['fields']['Column'] for col in cols]
        col_types = [col['fields']['Data Type'] for col in cols]
        key_types = [col['fields']['Key Type'] for col in cols]
        fkmapping = ''

        for col_name, col_type, key_type in zip(col_names, col_types, key_types):
            create_command = create_command + col_name + ' ' + col_type
            if key_type == 'P':
                create_command = create_command + ' PRIMARY KEY'
            elif key_type == 'F':
                fkmapping = ' ' + \
                    foreign_key_mappings[col_name] + \
                    ' ON UPDATE CASCADE ON DELETE CASCADE,'
            create_command = create_command + ','

        create_command = create_command + fkmapping
        create_command = create_command[:-1] + ')'
        create_commands.append(create_command)

    return create_commands

'''
Functions to generate insert commands and insert the data into the database.
'''
def insert_into(cur, base_key, api_key):
    insert_queries = []
    table_values = []
    airtable_md = Airtable(base_key, 'Master Data Tables', api_key)
    airtable_ud_p = Airtable(base_key, 'User Data Profile Tables', api_key)
    tables = airtable_md.get_all(sort='Order') + \
        airtable_ud_p.get_all(sort='Order')

    table_names = []
    for table in tables:
        table_names.append(table['fields']['Name'])

    for table in table_names:
        airtable_table = Airtable(base_key, table, api_key)
        cols = airtable_table.get_all(sort='Order')
        col_names = [col['fields']['Column'] for col in cols]
        col_types = [col['fields']['Data Type'] for col in cols]

        airtable_values = Airtable(base_key, table+'_SAMPLE', api_key)
        vals = airtable_values.get_all()
        values = []

        insert_query = 'INSERT INTO ' + table + \
            '(' + ','.join(col_names) + ') ' + 'VALUES(' + \
            ','.join(['%s' for i in range(len(col_names))]) + ')'

        for value in vals:
            data = []
            val = value['fields']
            for i in range(len(col_names)):
                if '[]' in col_types[i]:
                    data.append('{' + val[col_names[i]].replace('|', ',') + '}')
                elif col_types[i] == 'POINT':
                    x_coord, y_coord = val[col_names[i]].split(',')
                    x, y = float(x_coord[1:]), float(y_coord[:-1])
                    data.append(Point(x, y))
                elif 'INT' in col_types[i]:
                    if val[col_names[i]] == 'NULL':
                        data.append(None)
                    else:
                        data.append(int(val[col_names[i]]))
                elif 'DECIMAL' in col_types[i]:
                    if val[col_names[i]] == 'NULL':
                        data.append(None)
                    else:
                        data.append(float(val[col_names[i]]))
                elif col_types[i] == 'JSON':
                    data.append(json.dumps(val[col_names[i]]))
                else:
                    data.append(val[col_names[i]])
            
            values.append(tuple(data))
        insert_queries.append(insert_query)
        table_values.append(values)

    for i in range(len(insert_queries)):
        '''
        if 'UD_P_USER_HOMES' in insert_queries[i]:
            populate_user_homes(cur)
        else:
        '''
        cur.executemany(insert_queries[i], table_values[i])

'''
Function to generate the template json and update this information into the database.
'''
def populate_user_homes(cur):
    username = 'rkhandewale'
    get_address = "select ADDRESS from UD_P_USER_PROFILE where USER_ID LIKE '%" + username + "%'"
    cur.execute(get_address)
    address = cur.fetchall()[0]['address']

    get_template_id = "select TEMPLATE_ID from MD_ADDRESS_TEMPLATES where ADDRESS LIKE '%" + address + "%'"
    cur.execute(get_template_id)
    template_id = cur.fetchall()[0]['template_id']

    get_template_details = "select * from MD_TEMPLATES where TEMPLATE_ID = " + \
        str(template_id)
    cur.execute(get_template_details)
    template_details = cur.fetchall()
    template_type = template_details[0]['template_type']
    rooms = template_details[0]['room_ids']

    template_json = {
        'address': address,
        'template_id': template_id,
        'template_type': template_type[1:-1],
        'rooms': {}
    }

    get_room_information = "select * from MD_ROOMS where ROOM_ID in (''" + "'',''".join(
        rooms) + "'')"
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

    insert_query = "insert into UD_P_USER_HOMES(USERNAME, TEMPLATE_ID, TEMPLATE) values('''" + \
        username + "'''," + str(template_id) + ",'" + \
        json.dumps(template_json) + "')"
    cur.execute(insert_query)

pg_config_file = open('postgres_config.json',)
airtable_config_file = open('airtable_config.json',)
pg_config = json.load(pg_config_file)
airtable_config = json.load(airtable_config_file)

register_adapter(Point, adapt_point)

conn = psycopg2.connect(host=pg_config['host'], database=pg_config['database'],
                        user=pg_config['user'], password=pg_config['password'])
cur = conn.cursor(cursor_factory=RealDictCursor)
commands = create_commands(airtable_config['base_key'], airtable_config['api_key'])

for command in commands:
    print(command)
    cur.execute(command)

conn.commit()

insert_into(cur, airtable_config['base_key'], airtable_config['api_key'])
conn.commit()
