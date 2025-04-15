import os
import speech_recognition as sr
import pyttsx3

from langchain.chat_models import init_chat_model
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

import bs4
from langchain import hub
from langchain_community.document_loaders import WebBaseLoader, TextLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing_extensions import List, TypedDict

os.environ[
    "OPENAI_API_KEY"] = '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'

llm = init_chat_model("gpt-4o-mini", model_provider="openai")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

vector_store = Chroma(
    collection_name="university_data",
    embedding_function=embeddings,
    persist_directory="./university_info_db",
)

loader = TextLoader("Orare-Master.txt")
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
all_splits = text_splitter.split_documents(docs)

_ = vector_store.add_documents(documents=all_splits)

prompt = hub.pull("rlm/rag-prompt")

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
    retrieved_docs = vector_store.similarity_search(question)
    docs_content = "\n\n".join(doc.page_content for doc in retrieved_docs)
    prompt_fill = prompt.invoke({"question": question, "context": docs_content})
    answer = llm.invoke(prompt_fill)

    if hasattr(answer, 'content'):
        return answer.content
    return str(answer)


if __name__ == "__main__":
    question = "What lectures does Anca Ignat teach?"
    print(question)
    print(get_answer(question))

    # degeaba work here daca nu work si pe front >~<
    speak(get_answer(listen()))
