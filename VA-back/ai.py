import os
from dotenv import load_dotenv
import pyttsx3
import speech_recognition as sr
from langchain import hub
from langchain.chat_models import init_chat_model
from langchain_chroma import Chroma
from langchain_community.document_loaders import TextLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.memory import ConversationBufferMemory
from langchain_community.chat_message_histories import FileChatMessageHistory
from langchain.chains import ConversationalRetrievalChain

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise ValueError("OPENAI_API_KEY is missing in the .env file.")
os.environ["OPENAI_API_KEY"] = api_key


llm = init_chat_model("gpt-4o-mini", model_provider="openai")
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")

vector_store = Chroma(
    collection_name="university_data",
    embedding_function=embeddings,
    persist_directory="./university_info_db",
)

loader = TextLoader("info_chunks.txt", encoding="utf-8")
docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter( chunk_size=1200,
    chunk_overlap=300,
    separators=["\n\n---", "\n[COURSES]", "\n--- SHARED COURSES ---"],
    keep_separator=True)
all_splits = text_splitter.split_documents(docs)

_ = vector_store.add_documents(documents=all_splits)

prompt = hub.pull("rlm/rag-prompt")

memory = ConversationBufferMemory(memory_key="chat_history", chat_memory=FileChatMessageHistory("chat_history.json"), return_messages=True)
qa_chain = ConversationalRetrievalChain.from_llm(
    llm=llm,
    retriever=vector_store.as_retriever(),
    memory=memory,
    combine_docs_chain_kwargs={"prompt": prompt}
)

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
    result = qa_chain.invoke({"question": question})
    return result["answer"]



if __name__ == "__main__":
    while(True):
        question = input("Ask: ")
        # print(question)
        print(get_answer(question))
        print("updated memory: ", memory.load_memory_variables({}))


