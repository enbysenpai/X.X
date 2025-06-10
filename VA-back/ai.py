import os
import sys
import time

import pyttsx3
import speech_recognition as sr
from dotenv import load_dotenv
from langchain import hub
from langchain.chains import ConversationalRetrievalChain
from langchain.chat_models import init_chat_model
from langchain.memory import ConversationBufferMemory
from langchain_chroma import Chroma
from langchain_community.chat_message_histories import FileChatMessageHistory
from langchain_community.document_loaders import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from doc_descriptions import DOCUMENT_DESCRIPTIONS

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise ValueError("OPENAI_API_KEY is missing in the .env file.")

os.environ["OPENAI_API_KEY"] = api_key
llm = init_chat_model("gpt-4o-mini", model_provider="openai", temperature=0)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

DATA_FOLDER = "data"
VECTOR_DBS_FOLDER = "vector_dbs"


def build_vector_dbs():
    for filename in os.listdir(DATA_FOLDER):
        if filename.endswith(".txt"):
            filepath = os.path.join(DATA_FOLDER, filename)
            vector_dir = os.path.join(VECTOR_DBS_FOLDER, filename.replace(".txt", ""))
            if os.path.exists(vector_dir):
                print(f"[INFO] Vector DB already exists: {filename}")
                continue
            loader = TextLoader(filepath, encoding="utf-8")
            docs = loader.load()
            splits = text_splitter.split_documents(docs)
            metadata = DOCUMENT_DESCRIPTIONS.get(filename, {})
            for doc in splits:
                doc.metadata = {
                    "source_file": filename,
                    **{k: ", ".join(map(str, v)) if isinstance(v, list) else str(v) for k, v in metadata.items()}
                }

            os.makedirs(vector_dir, exist_ok=True)
            vector_db = Chroma.from_documents(
                documents=splits,
                embedding=embeddings,
                persist_directory=vector_dir)
            print(f"[SUCCESS] Created vector DB for: {filename}")


def classify_document_by_question(question):
    question = question.lower()
    relevant_files = []
    for filename, metadata in DOCUMENT_DESCRIPTIONS.items():
        keywords = metadata.get("keywords", [])
        if any(keyword.lower() in question.lower() for keyword in keywords):
            relevant_files.append(filename)
    if not relevant_files:
        relevant_files = list(DOCUMENT_DESCRIPTIONS.keys())  # return all files in no keyword found (god help us)
    return list(set(relevant_files))


def create_knowledge_base(embeddings, selected_files):
    if len(selected_files) == 1:
        filename = selected_files[0]
        vector_dir = os.path.join(VECTOR_DBS_FOLDER, filename.replace(".txt", ""))
        if os.path.exists(vector_dir):
            print(f"[SYS] Loading existing vector DB for single file: {filename}")
            return Chroma(persist_directory=vector_dir, embedding_function=embeddings)

        # otherwise, it will create a ChromaDB with all the files found
    all_docs = []
    for filename in selected_files:
        filepath = os.path.join(DATA_FOLDER, filename)
        loader = TextLoader(filepath, encoding="utf-8")
        docs = loader.load()
        splits = text_splitter.split_documents(docs)
        metadata = DOCUMENT_DESCRIPTIONS.get(filename, {})
        for doc in splits:
            doc.metadata = {
                "source_file": filename,
                **{k: ", ".join(map(str, v)) for k, v in metadata.items()}
            }
        all_docs.extend(splits)
    vector_store = Chroma.from_documents(
        documents=all_docs,
        embedding=embeddings,
        collection_name="university_data",
        persist_directory="./university_info_db")
    return vector_store


def get_retriever_for_question(question):
    files = classify_document_by_question(question)
    print(f"[SYS] Relevant files: {files}")
    knowledge_base = create_knowledge_base(embeddings, selected_files=files)
    return knowledge_base.as_retriever()


prompt = hub.pull("rlm/rag-prompt")
memory = ConversationBufferMemory(memory_key="chat_history",
                                  chat_memory=FileChatMessageHistory("chat_history.json"),
                                  return_messages=True)


def speak(text):
    engine = pyttsx3.init()
    engine.say(text)
    engine.runAndWait()


def listen():
    r = sr.Recognizer()
    with sr.Microphone() as source:
        print("Say something...")
        audio = r.listen(source)
    try:
        query = r.recognize_google(audio)
        print("You said:", query)
        return query
    except sr.UnknownValueError:
        print("Sorry, I couldn't understand.")
        return ""
    except sr.RequestError as e:
        print(f"Speech Recognition error: {e}")
        return ""


def get_answer(question):
    retriever = get_retriever_for_question(question)
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=retriever,
        memory=memory,
        combine_docs_chain_kwargs={"prompt": prompt}
    )
    result = qa_chain.invoke({"question": question})
    answer = result["answer"]

    if 'source_documents' in result:
        sources = list({doc.metadata['source_file'] for doc in result['source_documents']})
        answer += f"\n\n(Source: {', '.join(sources)})"
    return answer


if __name__ == "__main__":
    # build_vector_dbs()
    try:
        while (True):
            question = input("Ask: ").strip()
            # print(question)
            # start_time = time.time()
            print(get_answer(question))
            # print(f"Execution time: {time.time() - start_time}")
            print("updated memory: ", memory.load_memory_variables({}))
    except KeyboardInterrupt:
        print("[INFO] Shutting down...")