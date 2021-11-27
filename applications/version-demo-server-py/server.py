import asyncio
import websockets
import json
import time
import boto3
import random
import os
import io
from struct import unpack
from datetime import datetime
from fastavro import writer, reader
from aiokafka import AIOKafkaConsumer, AIOKafkaProducer

from schema_registry.serializers import MessageSerializer
from schema_registry.client import SchemaRegistryClient, schema

lambda_client = boto3.client('lambda', endpoint_url=f"http://{os.getenv('LOCALSTACK_HOSTNAME')}" if os.getenv('LOCALSTACK_HOSTNAME') else None)

cluster_hostname = os.getenv('KAFKA_CLUSTER_HOSTNAME')
schema_registry_hostname = os.getenv('SCHEMA_REGISTRY_HOSTNAME')
client = SchemaRegistryClient(url=schema_registry_hostname)
producer_lambda = os.getenv('PRODUCER_LAMBDA')

print("At the start")

def current_milli_time():
    return round(time.time() * 1000)

def get_schema (subject, schema_version):
    try:
        if schema_version:
            schema_version = client.get_schema(subject, int(schema_version))
        else:
            schema_version = client.get_schema(subject)
    except Exception as e:
        print("Error retrieving from Schema Registry: %s", e)

    schema = schema_version.schema.schema

    return schema

schema_for_frontend_consumer = {
        "person-v1.0": get_schema("person-v1-value", "1"),
        "person-v1.1": get_schema("person-v1-value", "2"),
        "person-v2.0": get_schema("person-v2-value", None)
    }

async def start_producer():
    producer = AIOKafkaProducer(
            bootstrap_servers=cluster_hostname)
    await producer.start()

    return producer

async def start_consumer(topic_name):
    consumer = AIOKafkaConsumer(
        topic_name,
        bootstrap_servers=cluster_hostname.split(","),
        group_id=topic_name)
    await consumer.start()

    return consumer

async def send(websocket, display_area, topic_name, msg_dict, timestamp, version):
    msg_dict["timestamp"] = datetime.fromtimestamp(int(timestamp)/ 1e3).strftime('%H:%M:%S-%f')[:-3]
    msg_dict["version"] = version
    await websocket.send(json.dumps({
            "display_area": display_area, 
            "topic_name": topic_name, 
            "messages": [msg_dict]}))

async def poll_and_send(websocket, consumer):
    # Consume messages
    async for msg in consumer:
        print("consumed: ", msg.topic, msg.partition, msg.offset,
                msg.key, msg.value, msg.timestamp)
        
        in_memory = io.BytesIO(msg.value)
        in_memory.seek(0)
        header_bytes=in_memory.read(5)
        magic, schema_id = unpack('>bI', header_bytes)
        schema = client.get_by_id(schema_id)
        version_dict = client.check_version(msg.topic + "-value", schema)
        original_version = str(version_dict.schema)
        semantic_version = str(version_dict.schema - 1)
        message_serializer = MessageSerializer(client)
        msg_dict = message_serializer.decode_message(msg.value)
        await send(
            websocket, "producer", 
            msg.topic, msg_dict, msg.timestamp, 
            msg.topic[8:] + "." + semantic_version)

        for schema_name in schema_for_frontend_consumer.keys():
            fo = io.BytesIO()
            schema = schema_for_frontend_consumer.get(schema_name)
            try: 
                writer(fo, schema, [msg_dict])
                fo.seek(0)
                for record in reader(fo):
                    await send(
                        websocket, schema_name, 
                        msg.topic, record, msg.timestamp, 
                        schema_name[8:])
            except Exception as e:
                print("Could not cast")
                print(e)

                # for 1.1 to display 1.0, with exception
                if msg.topic == "person-v1" and original_version == "1" and schema_name == "person-v1.1":
                    await send(
                        websocket, schema_name, 
                        msg.topic, msg_dict, msg.timestamp, 
                        "Warning - expected 1.1, received 1.0")

async def produce(number_records, topic_name, version):
    if version == "na":
        result = lambda_client.invoke(FunctionName=producer_lambda, 
                        InvocationType='Event',
                        Payload=json.dumps({
                            "topic_name": topic_name,
                            "number_records": int(number_records),
                            "seed": current_milli_time()
                        }))
    else:
        result = lambda_client.invoke(FunctionName=producer_lambda, 
                        InvocationType='Event',
                        Payload=json.dumps({
                            "topic_name": topic_name,
                            "number_records": int(number_records),
                            "version": version,
                            "seed": current_milli_time()
                        }))

async def ws_server(websocket, path):
    print("waiting...")
    try:
        consumer_1 = await start_consumer("person-v1")
        consumer_2 = await start_consumer("person-v2")

        async for msg in websocket:
            json_data = json.loads(msg)
            print(json_data)
            request_type = json_data.get("type")
            if request_type == "setup-connect":
                print("setting up consumers...")
                asyncio.create_task(poll_and_send(websocket, consumer_1))
                asyncio.create_task(poll_and_send(websocket, consumer_2))
                print("after poll")
            else:
                print(request_type)
                stream_size = json_data.get("batch_count")
                stream_topic = json_data.get("stream_topic")
                stream_version = json_data.get("stream_version")
                asyncio.create_task(produce(stream_size, stream_topic, stream_version))
                print(stream_version)

            print("after iteration")
    finally:
        # Will leave consumer group; perform autocommit if enabled.
        print("deleting consumer")
        await consumer_1.stop()
        await consumer_2.stop()
    

start_server = websockets.serve(ws_server, '0.0.0.0', 5678)

print("after server start")

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()